package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.sql.DataSource;
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.common.SolrInputDocument;
import org.json.JSONObject;
import org.apache.commons.lang3.time.DurationFormatUtils;
import org.apache.solr.client.solrj.impl.Http2SolrClient;

/**
 *
 * @author alberto
 */
public class HikoIndexer {

    public static final Logger LOGGER = Logger.getLogger(HikoIndexer.class.getName());
    String slovnik = "hiko";

    private Connection conn;

    public Connection getConnection() throws NamingException, SQLException {
        if (conn == null || conn.isClosed()) {
            Context initContext = new InitialContext();
            Context envContext = (Context) initContext.lookup("java:/comp/env");
            DataSource ds = (DataSource) envContext.lookup("jdbc/hiko");
            conn = ds.getConnection();
        }
        return conn;
    }

    public List<String> getTenants() {
        List<String> ret = new ArrayList();
        try {
            PreparedStatement ps = getConnection().prepareStatement("select table_prefix from tenants");
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    ret.add(rs.getString("table_prefix"));
                }
                rs.close();
            }
            ps.close();
        } catch (NamingException | SQLException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.add("error");
        }

        return ret;
    }

    private List<String> getTables() {
        List<String> ret = new ArrayList();
        List<String> tenants = getTenants();
        List<Object> keys = Options.getInstance().getJSONArray("dbKeywordTables").toList();
        for (String t : tenants) {
            for (Object k : keys) {
                ret.add(t + "__" + k);
            }
        }

        return ret;
    }

    public JSONObject full() {
        Date start = new Date();
        JSONObject ret = new JSONObject();
        int success = 0;
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            List<String> tenants = getTenants();
            for (String tenant : tenants) {
                getLetters(client, ret, tenant, success);
            }
        } catch (NamingException | SQLException | IOException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        Date end = new Date();
        ret.put("ellapsed time", DurationFormatUtils.formatDuration(end.getTime() - start.getTime(), "HH:mm:ss.S"));
        ret.put("total", success);
        return ret;
    }

    private void getLetters(SolrClient client, JSONObject ret, String tenant, int success) throws NamingException, SQLException {
        String t = tenant + "__letter_place";
        String sql = "select * from " + tenant + "__letters as L ";
        PreparedStatement ps = getConnection().prepareStatement(sql);
        try (ResultSet rs = ps.executeQuery()) {
            int tindexed = 0;
            while (rs.next()) {

                SolrInputDocument doc = new SolrInputDocument();

                String id = tenant + "_" + rs.getInt("L.id");

                doc.addField("id", id);
                doc.addField("table", t);
                doc.addField("table_id", rs.getInt("L.id"));
                doc.addField("tenant", tenant);
                doc.addField("letter_id", rs.getInt("L.id"));
                doc.addField("date_computed", rs.getDate("L.date_computed"));
                doc.addField("date_year", rs.getLong("L.date_year"));


                addPlaces(tenant, rs.getInt("L.id"), doc);
                addIdentities(tenant, rs.getInt("L.id"), doc);

                client.add("letter_place", doc);
                success++;
                if (success % 500 == 0) {
                    client.commit("letter_place");
                    LOGGER.log(Level.INFO, "Indexed {0} docs", success);
                }

                ret.put(t, tindexed++);
            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
            ret.put("error" + t, e);
        }
        ps.close();
    }

    public void addPlaces(String tenant, int letter_id, SolrInputDocument doc) throws SQLException, NamingException {

        String sql = "select * from " + tenant + "__letter_place as LP, " + tenant + "__places as P where LP.place_id = P.id AND LP.letter_id = " + letter_id;
        PreparedStatement psPlaces = getConnection().prepareStatement(sql); 
        int origin = -1;
        int destination = -1;
        try (ResultSet rs = psPlaces.executeQuery()) {
            while (rs.next()) {

                doc.addField("role", rs.getString("LP.role"));
                doc.addField("place_id", rs.getString("P.id"));
                doc.addField("name", rs.getString("P.name"));
                doc.addField("country", rs.getString("P.country"));
                doc.addField("note", rs.getString("P.note"));
                doc.addField("latitude", rs.getObject("P.latitude"));
                doc.addField("longitude", rs.getObject("P.longitude"));
                doc.addField("geoname_id", rs.getInt("P.geoname_id"));
                doc.addField("division", rs.getString("P.division"));
                if (rs.getString("P.latitude") != null) {
                    doc.addField("coords", rs.getString("P.latitude") + "," + rs.getString("P.longitude"));
                } 
                
                if ("origin".equals(rs.getString("LP.role"))) {
                    origin = rs.getInt("P.id");
                    doc.setField("origin", origin);
                }
                
                if ("destination".equals(rs.getString("LP.role"))) {
                    destination = rs.getInt("P.id");
                    doc.setField("destination", destination);
                }

                JSONObject places = new JSONObject()
                        .put("role", rs.getString("LP.role"))
                        .put("place_id", rs.getString("P.id"))
                        .put("name", rs.getString("P.name"))
                        .put("country", rs.getString("P.country"))
                        .put("note", rs.getString("P.note"))
                        .put("latitude", rs.getObject("P.latitude"))
                        .put("longitude", rs.getObject("P.longitude"))
                        .put("geoname_id", rs.getInt("P.geoname_id"))
                        .put("division", rs.getString("P.division"));
                doc.addField("places", places.toString());

            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        psPlaces.close();
    }

    private void addIdentities(String tenant, int letter_id, SolrInputDocument doc) throws SQLException, NamingException {

        String sqlIdentity = "select * from " + tenant + "__identity_letter as IL, " + tenant + "__identities as I where IL.identity_id=I.id AND letter_id = " + letter_id;
        PreparedStatement psIdentity = getConnection().prepareStatement(sqlIdentity);
        try (ResultSet rs = psIdentity.executeQuery()) {
            while (rs.next()) {
                doc.addField("identity_id", rs.getInt("I.id"));
                doc.addField("identity_role", rs.getString("IL.role"));
                doc.addField("identity_name", rs.getString("I.name"));
                
                doc.addField("identity_" + rs.getString("IL.role"), rs.getString("I.name"));
                
                JSONObject identities = new JSONObject()
                        .put("id", rs.getInt("I.id"))
                        .put("role", rs.getString("IL.role"))
                        .put("name", rs.getString("I.name"));
                doc.addField("identities", identities.toString());

            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        psIdentity.close();
    }
}
