package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.naming.NamingException;
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.common.SolrInputDocument;
import org.json.JSONObject;
import org.apache.commons.lang3.time.DurationFormatUtils;
import org.apache.solr.client.solrj.SolrServerException;
import org.apache.solr.client.solrj.impl.Http2SolrClient;
import org.json.JSONArray;

/**
 *
 * @author alberto
 */
public class HikoIndexer {

    public static final Logger LOGGER = Logger.getLogger(HikoIndexer.class.getName());
    final DateTimeFormatter dformatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    final DateTimeFormatter dtformatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    JSONObject globalKeywordCategories = new JSONObject();
    JSONObject globalProfessionCategories = new JSONObject();

    public JSONObject full() {
        Date start = new Date();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO letters");
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            //List<String> tenants = getTenants();
            getGlobalKeywordCategories();
            getGlobalProfessionCategories();
            Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
            for (String tenant : tenants) {
                getLetters(client, ret, tenant);
            }
            client.commit("hiko");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        Date end = new Date();
        ret.put("ellapsed time", DurationFormatUtils.formatDuration(end.getTime() - start.getTime(), "HH:mm:ss.S"));
        LOGGER.log(Level.INFO, "Indexing HIKO finished. {0} letters indexed");
        return ret;
    }

    public JSONObject indexTenant(String tenant) {
        Date start = new Date();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO letters");
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            //List<String> tenants = getTenants();
            getGlobalKeywordCategories();
            getLetters(client, ret, tenant);
            client.commit("hiko");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        Date end = new Date();
        ret.put("ellapsed time", DurationFormatUtils.formatDuration(end.getTime() - start.getTime(), "HH:mm:ss.S"));
        LOGGER.log(Level.INFO, "Indexing HIKO finished. {0} letters indexed");
        return ret;
    }
    
    private void getGlobalProfessionCategories() throws URISyntaxException, IOException, InterruptedException {
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", "hiko-test10")
                + "/global-profession-categories?per_page=100";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(url))
                .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                .GET()
                .build();

        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            HttpResponse<String> response = httpclient.send(request, BodyHandlers.ofString());
            JSONArray docs = new JSONObject(response.body()).getJSONArray("data");
            for (int i = 0; i < docs.length(); i++) {
                JSONObject d = docs.getJSONObject(i);
                globalProfessionCategories.put(d.getInt("id") + "", d);
            }
        }
    }

    private void getGlobalKeywordCategories() throws URISyntaxException, IOException, InterruptedException {
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", "hiko-test10")
                + "/global-keyword-categories?per_page=100";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(url))
                .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                .GET()
                .build();

        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            HttpResponse<String> response = httpclient.send(request, BodyHandlers.ofString());
            JSONArray docs = new JSONObject(response.body()).getJSONArray("data");
            for (int i = 0; i < docs.length(); i++) {
                JSONObject d = docs.getJSONObject(i);
                globalKeywordCategories.put(d.getInt("id") + "", d);
            }
        }
    }

    private void getLetters(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException {
        LOGGER.log(Level.INFO, "Indexing tenant: {0}.", tenant);
        String t = tenant;
        if (Options.getInstance().getBoolean("isTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t) 
                + "/letters?page=1&include=identities,identities.localProfessions,identities.localProfessions.profession_category,identities.globalProfessions,identities.globalProfessions.profession_category,places,keywords,globalKeywords";
//        HttpClient httpclient = HttpClient
//                .newBuilder()
//                .build();
        int indexed = 0;
        String r = "";
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                // LOGGER.log(Level.INFO, "Requesting: {0}.", url);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .timeout(Duration.ofSeconds(10))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, BodyHandlers.ofString());
                r = response.body();
                JSONObject resp = new JSONObject(r);
                JSONArray docs = resp.getJSONArray("data");
                for (int i = 0; i < docs.length(); i++) {
                    JSONObject rs = docs.getJSONObject(i);
                    SolrInputDocument doc = new SolrInputDocument();

                    String id = tenant + "_" + rs.getInt("id");

                    doc.addField("id", id);
                    doc.addField("table_id", rs.getInt("id"));
                    doc.addField("tenant", tenant);
                    doc.addField("letter_id", rs.getInt("id"));
                    doc.addField("status", rs.optString("status"));

                    LocalDate date = LocalDate.parse(rs.optString("date_computed"), dformatter);
                    doc.addField("date_computed", date.atStartOfDay().format(dtformatter));
                    doc.addField("date_year", rs.optInt("date_year"));

                    addPlaces(rs.getJSONArray("places"), doc);
                    addIdentities(rs.getJSONArray("identities"), doc);
                    addGlobalKeywords(rs.getJSONArray("global_keywords"), doc);
                    addGlobalKeywords(rs.optJSONArray("keywords"), doc);
//                int k = addGlobalKeywords(tenant, rs.getInt("L.id"), doc);
//                if (k == 0) {
//                    addKeywords(tenant, rs.getInt("L.id"), doc);
//                }

                    client.add("hiko", doc);
                    indexed++;
                    if ((indexed % 500) == 0) {
                        client.commit("hiko");
                        LOGGER.log(Level.INFO, "Indexed {0} docs", indexed);
                    }

                }
                ret.put(tenant, indexed++);
                url = resp.optString("next_page_url", null);
                Thread.sleep(1000);
            }
            // httpclient.close();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error indexing {0}", url);
            LOGGER.log(Level.SEVERE, "Response is {0}", r);
            LOGGER.log(Level.SEVERE, null, e);
            ret.put("error" + tenant, e);
        }
    }

    private void addGlobalKeywords(JSONArray keywords, SolrInputDocument doc) throws SQLException, NamingException {

        for (int i = 0; i < keywords.length(); i++) {
            JSONObject rs = keywords.getJSONObject(i);
            long cat = rs.optLong("keyword_category_id");
            JSONObject k = rs.getJSONObject("name");
            doc.addField("keywords_cs", k.optString("cs"));
            doc.addField("keywords_en", k.optString("en"));
            if (globalKeywordCategories.has(cat + "")) {
                JSONObject c = globalKeywordCategories.getJSONObject(cat + "").getJSONObject("name");
                if (!doc.containsKey("keywords_category_cs") || !doc.getFieldValues("keywords_category_cs").contains(c.optString("cs"))) {
                    doc.addField("keywords_category_cs", c.optString("cs"));
                    doc.addField("keywords_category_en", c.optString("en"));
                }
                k.put("category_name", c);
            }
            doc.addField("keywords", rs.toString());
        }
    }

    private void addPlaces(JSONArray places, SolrInputDocument doc) throws SQLException, NamingException {

        for (int i = 0; i < places.length(); i++) {
            JSONObject rs = places.getJSONObject(i);
            String role = rs.getJSONObject("pivot").optString("role");
            doc.addField("role", role);
            doc.addField("place_id", rs.getInt("id"));
            doc.addField("name", rs.optString("name"));
            doc.addField("country", rs.optString("country"));
            doc.addField("note", rs.optString("note"));
            doc.addField("latitude", rs.optFloat("latitude"));
            doc.addField("longitude", rs.optFloat("longitude"));
            doc.addField("geoname_id", rs.optInt("geoname_id"));
            doc.addField("division", rs.optString("division"));
            if (!Float.isNaN(rs.optFloat("latitude"))) {
                doc.addField("coords", rs.optFloat("latitude") + "," + rs.optFloat("longitude"));
            }
            if ("origin".equals(role)) {
                doc.setField("origin", rs.getInt("id"));
            }
            if ("destination".equals(role)) {
                doc.setField("destination", rs.getInt("id"));
            }
            rs.put("role", role);
            doc.addField("places", rs.toString());

        }
    }

    private void addIdentities(JSONArray identities, SolrInputDocument doc) throws SQLException, NamingException {

        for (int i = 0; i < identities.length(); i++) {
            JSONObject rs = identities.getJSONObject(i);
            String role = rs.getJSONObject("pivot").optString("role");
            doc.addField("identity_id", rs.getInt("id"));
            doc.addField("identity_role", role);
            doc.addField("identity_name", rs.getString("name"));

            doc.addField("identity_" + role, rs.getString("name"));

            JSONObject identity = new JSONObject()
                    .put("id", rs.getInt("id"))
                    .put("role", role)
                    .put("name", rs.getString("name"));
            addProfessions(rs.optJSONArray("global_professions"), role, doc);
            addProfessions(rs.optJSONArray("local_professions"), role, doc);
//                if (p == 0) {
//                   addProfessions(tenant, rs.getInt("I.id"), doc, identity);
//                }
            doc.addField("identities", identity.toString());

        }
    }

    private void addProfessions(JSONArray professions, String role, SolrInputDocument doc) throws SQLException, NamingException {

        for (int i = 0; i < professions.length(); i++) {
            JSONObject rs = professions.getJSONObject(i);

            JSONObject k = rs.optJSONObject("name")
                    .put("id", rs.getLong("id"));

            doc.addField("professions_id", rs.getInt("id"));
            doc.addField("professions_cs", k.optString("cs", null));
            doc.addField("professions_en", k.optString("en", null));
            doc.addField("professions_" + role + "_cs", k.optString("cs", null));
            doc.addField("professions_" + role + "_en", k.optString("en", null));

            String cat = rs.optInt("profession_category_id") + "";
            if (globalKeywordCategories.has(cat)) {
                JSONObject pc = globalKeywordCategories.getJSONObject(cat).getJSONObject("name");

                k.put("category", pc);
                doc.addField("professions_category_id", rs.optInt("profession_category_id"));
                doc.addField("professions_category_cs", pc.optString("cs", null));
                doc.addField("professions_category_en", pc.optString("en", null));
                doc.addField("professions_category_" + role + "_cs", pc.optString("cs", null));
                doc.addField("professions_category_" + role + "_en", pc.optString("en", null));
            }
            rs.append("professions", k);
            doc.addField("professions", k.toString());
        }
    }
}
