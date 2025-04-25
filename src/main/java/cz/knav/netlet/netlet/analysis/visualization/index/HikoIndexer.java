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

    public JSONObject places() {
        Date start = new Date();
        JSONObject ret = new JSONObject();
        int tindexed = 0;
        int success = 0;
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            List<String> tenants = getTenants();
            for (String tenant : tenants) {
                String t = tenant + "__places";
                PreparedStatement ps = getConnection().prepareStatement("select * from " + t);
                try (ResultSet rs = ps.executeQuery()) {
                    tindexed = 0;
                    while (rs.next()) {

                        SolrInputDocument doc = new SolrInputDocument();

                        String id = tenant + "_" + rs.getInt("id");

                        doc.addField("id", id);
                        doc.addField("table", t);
                        doc.addField("table_id", rs.getInt("id"));
                        doc.addField("tenant", tenant);
                        doc.addField("name", rs.getString("name"));
                        doc.addField("country", rs.getString("country"));
                        doc.addField("note", rs.getString("note"));
                        doc.addField("latitude", rs.getString("latitude"));
                        doc.addField("longitude", rs.getString("longitude"));
                        doc.addField("geoname_id", rs.getInt("geoname_id"));
                        doc.addField("division", rs.getString("division"));

                        if (rs.getString("latitude") != null) {
                            doc.addField("coords", rs.getString("latitude") + "," + rs.getString("longitude"));
                        }
                        client.add("places", doc);
                        success++;
                        if (success % 500 == 0) {
                            client.commit("places");
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
        } catch (NamingException | SQLException | IOException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        Date end = new Date();
        ret.put("ellapsed time", DurationFormatUtils.formatDuration(end.getTime() - start.getTime(), "HH:mm:ss.S"));
        ret.put("total", success);
        return ret;
    }

    public JSONObject full() {
        Date start = new Date();
        JSONObject ret = new JSONObject();
        int tindexed = 0;
        int success = 0;
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            List<String> tenants = getTenants();

            for (String tenant : tenants) {
                String t = tenant + "__letter_place";
                String sql = "select * from " + tenant + "__letter_place as LP, " + tenant + "__places as P, " + tenant + "__letters as L "
                        + "where LP.letter_id = L.id AND LP.place_id = P.id";
                PreparedStatement ps = getConnection().prepareStatement(sql);
                try (ResultSet rs = ps.executeQuery()) {
                    tindexed = 0;
                    while (rs.next()) {

                        SolrInputDocument doc = new SolrInputDocument();

                        String id = tenant + "_" + rs.getInt("LP.id");

                        doc.addField("id", id);
                        doc.addField("table", t);
                        doc.addField("table_id", rs.getInt("LP.id"));
                        doc.addField("tenant", tenant);
                        doc.addField("letter_id", rs.getInt("LP.letter_id"));
                        doc.addField("place_id", rs.getInt("LP.place_id"));
                        doc.addField("role", rs.getString("LP.role"));

                        doc.addField("date_computed", rs.getDate("L.date_computed"));
                        doc.addField("date_year", rs.getLong("L.date_year"));

                        doc.addField("name", rs.getString("P.name"));
                        doc.addField("country", rs.getString("P.country"));
                        doc.addField("note", rs.getString("P.note"));
                        doc.addField("latitude", rs.getString("P.latitude"));
                        doc.addField("longitude", rs.getString("P.longitude"));
                        doc.addField("geoname_id", rs.getInt("P.geoname_id"));
                        doc.addField("division", rs.getString("P.division"));
                        if (rs.getString("latitude") != null) {
                            doc.addField("coords", rs.getString("P.latitude") + "," + rs.getString("P.longitude"));
                        }

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
        } catch (NamingException | SQLException | IOException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        Date end = new Date();
        ret.put("ellapsed time", DurationFormatUtils.formatDuration(end.getTime() - start.getTime(), "HH:mm:ss.S"));
        ret.put("total", success);
        return ret;
    }

}
