package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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
import org.apache.solr.client.solrj.impl.HttpJdkSolrClient;
import org.apache.solr.client.solrj.impl.NoOpResponseParser;
import org.apache.solr.client.solrj.request.json.JsonQueryRequest;
import org.apache.solr.common.util.NamedList;
import org.json.JSONArray;

/**
 *
 * @author alberto
 */
public class HikoIndexer {

    public static final Logger LOGGER = Logger.getLogger(HikoIndexer.class.getName());
    final DateTimeFormatter dformatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    final DateTimeFormatter dtformatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    JSONObject keywordCategories = new JSONObject();
    JSONObject professions = new JSONObject();
    JSONObject places = new JSONObject();
    
    private JSONArray getIdentityProfessions(String identityId) {

        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    .withFilter("id:" + identityId)
                    .returnFields("professions:[json]")
                    .setLimit(1);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "identities");
            String jsonResponse = (String) resp.get("response");
            JSONObject ret = new JSONObject(jsonResponse);

            JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
            if (docs.length() > 0) {
                return docs.getJSONObject(0).optJSONArray("professions", new JSONArray());
            }

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, "", ex);
        }
        return new JSONArray();

    }

    private void initKeywords() throws URISyntaxException, IOException, InterruptedException {

        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    .returnFields("id,category_cs,category_cs")
                    .setLimit(10000);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "keywords");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);

            JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
            for (int i = 0; i < docs.length(); i++) {
                JSONObject d = docs.getJSONObject(i);
                keywordCategories.put(d.getString("id") + "", d);
            }

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }

    }

    private void initProfessions() throws URISyntaxException, IOException, InterruptedException {

        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    .setLimit(10000);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "professions");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);

            JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
            for (int i = 0; i < docs.length(); i++) {
                JSONObject d = docs.getJSONObject(i);
                professions.put(d.getString("id") + "", d);
            }

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }

    }
    
    private void initPlaces() throws URISyntaxException, IOException, InterruptedException {

        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    .setLimit(10000);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "places");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);

            JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
            for (int i = 0; i < docs.length(); i++) {
                JSONObject d = docs.getJSONObject(i);
                places.put(d.getString("id") + "", d);
            }

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }

    }

    public JSONObject update(int value, String unit) {
        Date start = new Date();
        JSONObject ret = new JSONObject();

//--data-urlencode "filter[updated_at_after]=2025-05-18 09:19:02" \
//--data-urlencode "filter[updated_at_before]=2025-05-18 09:19:39" \
        String from = Instant.now().minus(value, ChronoUnit.valueOf(unit)).toString();
        LOGGER.log(Level.INFO, "Updating HIKO letters from {0}", from);
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            //List<String> tenants = getTenants();

            initKeywords();
            initPlaces();
            initProfessions();
            Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
            for (String tenant : tenants) {
                getLetters(client, ret, tenant, from);
            }
            client.commit("hiko");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }

        Date end = new Date();
        ret.put("ellapsed time", DurationFormatUtils.formatDuration(end.getTime() - start.getTime(), "HH:mm:ss.S"));
        LOGGER.log(Level.INFO, "Update HIKO finished. {0} letters indexed");
        return ret;
    }

    public JSONObject full() {
        Date start = new Date();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO letters");
        try (SolrClient client = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            initKeywords();
            initPlaces();
            initProfessions();
            Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
            for (String tenant : tenants) {
                getLetters(client, ret, tenant, null);
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
            initKeywords();
            initPlaces();
            initProfessions();
            getLetters(client, ret, tenant, null);
            client.commit("hiko");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing tenant", ex);
            ret.put("error", ex);
        }
        Date end = new Date();
        ret.put("ellapsed time", DurationFormatUtils.formatDuration(end.getTime() - start.getTime(), "HH:mm:ss.S"));
        LOGGER.log(Level.INFO, "Indexing HIKO finished. {0} letters indexed");
        return ret;
    }

    private void getLetters(SolrClient client, JSONObject ret, String tenant, String from) throws URISyntaxException, IOException, InterruptedException {
        LOGGER.log(Level.INFO, "Indexing tenant: {0}.", tenant);
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t)
                + "/letters?page=1&include=identities,identities.localProfessions,identities.localProfessions.profession_category,identities.globalProfessions,identities.globalProfessions.profession_category,places,keywords,globalKeywords";
        if (from != null) {
            url += "&filter[updated_at_after]=" + from;
        }
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

                    //LocalDate date = LocalDate.parse(rs.optString("date_computed"), dformatter);
                    int date_year = rs.optInt("date_year");
                    int date_month = rs.optInt("date_month");
                    int date_day = rs.optInt("date_day");
                    LocalDate date = LocalDate.of(date_year, date_month, date_day);
                    doc.addField("date_computed", date.atStartOfDay().format(dtformatter));
                    doc.addField("date_year", date_year);

                    addPlaces(rs.getJSONArray("origins"), "origins", doc, tenant);
                    addPlaces(rs.getJSONArray("destinations"), "destinations", doc, tenant);
                    addIdentities(rs.getJSONArray("authors"), "author", doc, tenant);
                    addIdentities(rs.getJSONArray("recipients"), "recipient", doc, tenant);
                    addIdentities(rs.getJSONArray("mentioned"), "mentioned", doc, tenant);
                    addKeywords(rs.optJSONArray("keywords"), doc, tenant);
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
            // LOGGER.log(Level.SEVERE, "Response is {0}", r);
            LOGGER.log(Level.SEVERE, "", e);
            ret.put("error" + tenant, e);
        }
    }

    private void addKeywords(JSONArray keywords, SolrInputDocument doc, String tenant) throws SQLException, NamingException {
/**
 * 
 * "keywords": [
      {
        "id": 74,
        "scope": "local",
        "reference": "local-74",
        "name_cs": "Mistni klicove slovo",
        "name_en": "Local keyword",
        "type": "L."
      },
      {
        "id": 10442,
        "scope": "global",
        "reference": "global-10442",
        "name_cs": "Global klicove slovo",
        "name_en": "Global keyword",
        "type": "G."
      }
    ],
    * 
    * 
 */
        for (int i = 0; i < keywords.length(); i++) {
            JSONObject rs = keywords.getJSONObject(i);
            
            
            String scope = rs.optString("scope");
            String keyword_id = ("local".equals(scope) ? tenant : "global") + "_" + rs.getInt("id");
            
            doc.addField("keywords_cs", rs.optString("name_cs"));
            doc.addField("keywords_en", rs.optString("name_en"));
            if (keywordCategories.has(keyword_id)) {
                JSONObject c = keywordCategories.getJSONObject(keyword_id   );
                if (!doc.containsKey("keywords_category_cs") || !doc.getFieldValues("keywords_category_cs").contains(c.optString("category_cs"))) {
                    doc.addField("keywords_category_cs", c.optString("category_cs"));
                    doc.addField("keywords_category_en", c.optString("category_en"));
                }
            }
            doc.addField("keywords", rs.toString());
        }
    }

    private void addPlaces(JSONArray lplaces, String type, SolrInputDocument doc, String tenant) throws SQLException, NamingException {

        /**
         *
         * "origins": [ { "id": 11, "scope": "local", "reference": "local-11",
         * "name": "Brno", "marked": "Brno", "salutation": null } ],
         */
        for (int i = 0; i < lplaces.length(); i++) {
            JSONObject rs = lplaces.getJSONObject(i);

            String scope = rs.optString("scope");
            String place_id = ("local".equals(scope) ? tenant : "global") + "_" + rs.getInt("id");
            JSONObject pl = places.getJSONObject(place_id);
            doc.addField("place_id", rs.getInt("id"));
            doc.addField("name", pl.optString("name"));
            doc.addField("country", pl.optString("country"));
            doc.addField("note", pl.optString("note"));
            doc.addField("latitude", pl.optFloat("latitude"));
            doc.addField("longitude", pl.optFloat("longitude"));
            doc.addField("geoname_id", pl.optInt("geoname_id"));
            doc.addField("division", pl.optString("division"));
            if (!Float.isNaN(pl.optFloat("latitude"))) {
                doc.addField("coords", pl.optFloat("latitude") + "," + pl.optFloat("longitude"));
            }
            if ("origins".equals(type)) {
                doc.setField("origin", rs.getInt("id"));
                doc.setField("origin_name", pl.optString("name"));
            }
            if ("destinations".equals(type)) {
                doc.setField("destination", rs.getInt("id"));
                doc.setField("destination_name", pl.optString("name"));
            }
            doc.addField("places", rs.toString());

        }
    }

    private void addIdentities(JSONArray identities, String role, SolrInputDocument doc, String tenant) throws SQLException, NamingException {

        for (int i = 0; i < identities.length(); i++) {
            JSONObject rs = identities.getJSONObject(i);
            String scope = rs.optString("scope");
            String id = ("local".equals(scope) ? tenant : "global") + "_" + rs.getInt("id");
            doc.addField("identity_id", rs.getInt("id"));
            doc.addField("identity_role", role);
            doc.addField("identity_name", rs.getString("name"));

            doc.addField("identity_" + role, rs.getString("name"));

            JSONObject identity = new JSONObject()
                    .put("id", id)
                    .put("role", role)
                    .put("name", rs.getString("name"));

            addProfessions(id, role, doc, tenant);

            doc.addField("identities", identity.toString());

        }
    }

    private void addProfessions(String identityId, String role, SolrInputDocument doc, String tenant) throws SQLException, NamingException {
        JSONArray lprofessions = getIdentityProfessions(identityId);
        for (int i = 0; i < lprofessions.length(); i++) {
            JSONObject rs = lprofessions.getJSONObject(i);

            String scope = rs.optString("scope");
            String id = ("local".equals(scope) ? tenant : "global") + "_" + rs.getInt("id");

            JSONObject k = rs.optJSONObject("name")
                    .put("id", id);

            doc.addField("professions_id", rs.getInt("id"));
            doc.addField("professions_cs", k.optString("cs", null));
            doc.addField("professions_en", k.optString("en", null));
            doc.addField("professions_" + role + "_cs", k.optString("cs", null));
            doc.addField("professions_" + role + "_en", k.optString("en", null));
            if (professions.has(id)) {
                JSONObject pc = professions.getJSONObject(id);

                k.put("category", pc);
                doc.addField("professions_category_id", pc.optInt("category_id"));
                doc.addField("professions_category_cs", pc.optString("category_cs", null));
                doc.addField("professions_category_en", pc.optString("category_en", null));
                doc.addField("professions_category_" + role + "_cs", pc.optString("category_cs", null));
                doc.addField("professions_category_" + role + "_en", pc.optString("category_en", null));
            }
            rs.append("professions", k);
            doc.addField("professions", k.toString());
        }
    }
}
