package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
import org.json.JSONArray;

/**
 *
 * @author alberto
 */
public class HikoIndexer {

    public static final Logger LOGGER = Logger.getLogger(HikoIndexer.class.getName());
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

    public List<String> getTenantsFromIndex() {
        List<String> ret = new ArrayList();
        try {
            JSONObject json = IndexSearcher.getTenants().getJSONObject("facets").getJSONObject("tenant");
            JSONArray ja = json.getJSONArray("buckets");
            for (int i = 0; i < ja.length(); i++) {
                ret.add(ja.getJSONObject(i).getString("val"));
            }
            
        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.add("error");
        }

        return ret;
    }

    public JSONObject full() {
        Date start = new Date();
        JSONObject ret = new JSONObject();
        Integer success = 0;
        LOGGER.log(Level.INFO, "Indexing HIKO letters");
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            //List<String> tenants = getTenants();
            List<String> tenants = getTenantsFromIndex();
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
        LOGGER.log(Level.INFO, "Indexing HIKO finished. {0} letters indexed", success);
        return ret;
    }

    private void getLetters(SolrClient client, JSONObject ret, String tenant, Integer success) throws NamingException, SQLException {
        LOGGER.log(Level.INFO, "Indexing tenant: {0}.", tenant);
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
                doc.addField("status", rs.getString("L.status")); 
                doc.addField("date_computed", rs.getDate("L.date_computed"));
                doc.addField("date_year", rs.getLong("L.date_year"));

                addPlaces(tenant, rs.getInt("L.id"), doc);
                addIdentities(tenant, rs.getInt("L.id"), doc);
                int k = addGlobalKeywords(tenant, rs.getInt("L.id"), doc);
                if (k ==0) {
                    addKeywords(tenant, rs.getInt("L.id"), doc);
                }

                client.add("letter_place", doc);
                success++;
                if ((success % 500) == 0) {
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
                doc.addField("place_id", rs.getInt("P.id"));
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
                        .put("place_id", rs.getInt("P.id"))
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

                JSONObject identity = new JSONObject()
                        .put("id", rs.getInt("I.id"))
                        .put("role", rs.getString("IL.role"))
                        .put("name", rs.getString("I.name"));
                int p = addGlobalProfessions(tenant, rs.getInt("I.id"), doc, identity);
                if (p == 0) {
                   addProfessions(tenant, rs.getInt("I.id"), doc, identity);
                }
                doc.addField("identities", identity.toString());

            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        psIdentity.close();
    }
    
    private void addProfessions(String tenant, int identity_id, SolrInputDocument doc, JSONObject identity) throws SQLException, NamingException {

        String sql = "select * from " + tenant + "__identity_profession as IL, " + 
                tenant + "__professions as P left join " + 
                tenant + "__profession_categories as PC on PC.id=P.profession_category_id where IL.profession_id=P.id AND identity_id = " + identity_id;
        
        
        PreparedStatement ps = getConnection().prepareStatement(sql);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                 
                JSONObject k = new JSONObject(rs.getString("P.name"))
                        .put("id", rs.getLong("P.id")); 
                
                doc.addField("professions_id", rs.getInt("P.id"));
                doc.addField("professions_cs", k.optString("cs", null));
                doc.addField("professions_en", k.optString("en", null));
                doc.addField("professions_" + identity.getString("role") + "_cs", k.optString("cs", null));
                doc.addField("professions_" + identity.getString("role") + "_en", k.optString("en", null));
                
                if (rs.getString("PC.name") != null) {
                    JSONObject pc = new JSONObject(rs.getString("PC.name"))
                        .put("id", rs.getLong("PC.id"));
                    k.put("category", pc);
                    doc.addField("professions_category_id", rs.getInt("PC.id"));
                    doc.addField("professions_category_cs", pc.optString("cs", null));
                    doc.addField("professions_category_en", pc.optString("en", null));
                    doc.addField("professions_category_" + identity.getString("role") + "_cs", pc.optString("cs", null));
                    doc.addField("professions_category_" + identity.getString("role") + "_en", pc.optString("en", null));
                }
                identity.append("professions", k);
                doc.addField("professions", k.toString());
            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        ps.close();
    }

    private void addKeywords(String tenant, int letter_id, SolrInputDocument doc) throws SQLException, NamingException {

        String sqlCat = " select * from " + tenant + "__keyword_categories";
        Map<Long, String> categories = new HashMap<>();
        PreparedStatement psCat = getConnection().prepareStatement(sqlCat);
        try (ResultSet rs = psCat.executeQuery()) {
            while (rs.next()) {
                categories.put(rs.getLong("id"), rs.getString("name"));
            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        psCat.close();

        String sql = "select * from "
                + tenant + "__keyword_letter as KL, "
                + tenant + "__keywords as K where KL.keyword_id=K.id AND letter_id = " + letter_id;
        PreparedStatement ps = getConnection().prepareStatement(sql);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                long cat = rs.getLong("K.keyword_category_id");
                JSONObject k = new JSONObject(rs.getString("K.name"))
                        .put("id", rs.getLong("K.id"));
                doc.addField("keywords_cs", k.optString("cs"));
                doc.addField("keywords_en", k.optString("en"));
                if (categories.containsKey(cat)) {
                    JSONObject c = new JSONObject(categories.get(cat));
                    doc.addField("keywords_category_cs", c.optString("cs"));
                    doc.addField("keywords_category_en", c.optString("en"));
                    k.put("category_id", cat).put("category_name", categories.get(cat));
                }
                doc.addField("keywords", k.toString());
            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error adding keywords for tenant: {0}", tenant);
            LOGGER.log(Level.SEVERE, null, e);
        }
        ps.close();
    }
    
    private int addGlobalProfessions(String tenant, int identity_id, SolrInputDocument doc, JSONObject identity) throws SQLException, NamingException {

        String sql = "select * from " + 
                tenant + "__identity_profession as IL, global_professions as P left join global_profession_categories as PC on PC.id=P.profession_category_id "
                + " where IL.global_profession_id=P.id AND identity_id = " + identity_id;
        
        int ret = 0;
        PreparedStatement ps = getConnection().prepareStatement(sql);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                ret++;
                JSONObject k = new JSONObject(rs.getString("P.name"))
                        .put("id", rs.getLong("P.id")); 
                
                doc.addField("professions_id", rs.getInt("P.id"));
                doc.addField("professions_cs", k.optString("cs", null));
                doc.addField("professions_en", k.optString("en", null));
                doc.addField("professions_" + identity.getString("role") + "_cs", k.optString("cs", null));
                doc.addField("professions_" + identity.getString("role") + "_en", k.optString("en", null));
                
                if (rs.getString("PC.name") != null) {
                    JSONObject pc = new JSONObject(rs.getString("PC.name"))
                        .put("id", rs.getLong("PC.id"));
                    k.put("category", pc);
                    doc.addField("professions_category_id", rs.getInt("PC.id"));
                    doc.addField("professions_category_cs", pc.optString("cs", null));
                    doc.addField("professions_category_en", pc.optString("en", null));
                    doc.addField("professions_category_" + identity.getString("role") + "_cs", pc.optString("cs", null));
                    doc.addField("professions_category_" + identity.getString("role") + "_en", pc.optString("en", null));
                }
                identity.append("professions", k);
                doc.addField("professions", k.toString());
            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        ps.close();
        return ret;
    }
    
    private int addGlobalKeywords(String tenant, int letter_id, SolrInputDocument doc) throws SQLException, NamingException {
        int ret = 0;
        String sqlCat = " select * from global_keyword_categories";
        Map<Long, String> categories = new HashMap<>();
        PreparedStatement psCat = getConnection().prepareStatement(sqlCat);
        try (ResultSet rs = psCat.executeQuery()) {
            while (rs.next()) {
                categories.put(rs.getLong("id"), rs.getString("name"));
            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        psCat.close();

        String sql = "select * from "
                + tenant + "__keyword_letter as KL, global_keywords as K where KL.global_keyword_id=K.id AND letter_id = " + letter_id;
        PreparedStatement ps = getConnection().prepareStatement(sql);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                ret++;
                long cat = rs.getLong("K.keyword_category_id");
                JSONObject k = new JSONObject(rs.getString("K.name"))
                        .put("id", rs.getLong("K.id"));
                doc.addField("keywords_cs", k.optString("cs"));
                doc.addField("keywords_en", k.optString("en"));
                if (categories.containsKey(cat)) {
                    JSONObject c = new JSONObject(categories.get(cat));
                    doc.addField("keywords_category_cs", c.optString("cs"));
                    doc.addField("keywords_category_en", c.optString("en"));
                    k.put("category_id", cat).put("category_name", categories.get(cat));
                }
                doc.addField("keywords", k.toString());
            }
            rs.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error adding keywords for tenant: {0}", tenant);
            LOGGER.log(Level.SEVERE, null, e);
        }
        ps.close();
        return ret;
    }
}
