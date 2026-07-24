package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.common.SolrInputDocument;
import org.json.JSONObject;
import org.apache.commons.lang3.time.DurationFormatUtils;
import org.apache.solr.client.solrj.SolrServerException;
import org.apache.solr.client.solrj.impl.HttpJdkSolrClient;
import org.apache.solr.client.solrj.jetty.HttpJettySolrClient;
import org.apache.solr.client.solrj.request.json.JsonQueryRequest;
import org.apache.solr.client.solrj.response.InputStreamResponseParser;
import org.apache.solr.common.util.NamedList;
import org.json.JSONArray;
import org.json.JSONException;

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
  JSONObject identityProfessions = new JSONObject();
  JSONObject places = new JSONObject();

  private JSONArray getIdentityProfessions(String identityId) {
    if (identityProfessions.has(identityId)) {
      return identityProfessions.getJSONArray(identityId);
    }
    try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

      JsonQueryRequest jrequest = new JsonQueryRequest()
              .setQuery("*:*")
              .withFilter("id:" + identityId)
              .returnFields("professions:[json]")
              .setLimit(1);

      jrequest.setResponseParser(new InputStreamResponseParser("json"));

      NamedList<Object> resp = solr.request(jrequest, "identities");
      InputStream is = (InputStream) resp.get("stream");
      JSONObject ret = new JSONObject(IOUtils.toString(is, "UTF-8"));

//            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
//            rawJsonResponseParser.setWriterType("json");
//            jrequest.setResponseParser(rawJsonResponseParser);
//            NamedList<Object> resp = solr.request(jrequest, "identities");
//            String jsonResponse = (String) resp.get("response");
//            JSONObject ret = new JSONObject(jsonResponse);
      JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
      if (docs.length() > 0) {
        identityProfessions.put(identityId, docs.getJSONObject(0).optJSONArray("professions", new JSONArray()));
        return identityProfessions.getJSONArray(identityId);
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

      jrequest.setResponseParser(new InputStreamResponseParser("json"));

      NamedList<Object> resp = solr.request(jrequest, "keywords");
      InputStream is = (InputStream) resp.get("stream");
      ret = new JSONObject(IOUtils.toString(is, "UTF-8"));

      JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
      for (int i = 0; i < docs.length(); i++) {
        JSONObject d = docs.getJSONObject(i);
        keywordCategories.put(d.getString("id") + "", d);
      }

    } catch (Exception ex) {
      LOGGER.log(Level.SEVERE, "Error {0}", ex);
      ret.put("error", ex);
    }

  }

  private void initProfessions() throws URISyntaxException, IOException, InterruptedException {

    JSONObject ret = new JSONObject();
    try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

      JsonQueryRequest jrequest = new JsonQueryRequest()
              .setQuery("*:*")
              .setLimit(10000);

      jrequest.setResponseParser(new InputStreamResponseParser("json"));

      NamedList<Object> resp = solr.request(jrequest, "professions");
      InputStream is = (InputStream) resp.get("stream");
      ret = new JSONObject(IOUtils.toString(is, "UTF-8"));

      JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
      for (int i = 0; i < docs.length(); i++) {
        JSONObject d = docs.getJSONObject(i);
        professions.put(d.getString("id") + "", d);
      }

    } catch (Exception ex) {
      LOGGER.log(Level.SEVERE, "Error {0}", ex);
      ret.put("error", ex);
    }

  }

  private void initPlaces() throws URISyntaxException, IOException, InterruptedException {

    JSONObject ret = new JSONObject();
    try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

      JsonQueryRequest jrequest = new JsonQueryRequest()
              .setQuery("*:*")
              .setLimit(10000);

      jrequest.setResponseParser(new InputStreamResponseParser("json"));

      NamedList<Object> resp = solr.request(jrequest, "places");
      InputStream is = (InputStream) resp.get("stream");
      ret = new JSONObject(IOUtils.toString(is, "UTF-8"));

      JSONArray docs = ret.getJSONObject("response").getJSONArray("docs");
      for (int i = 0; i < docs.length(); i++) {
        JSONObject d = docs.getJSONObject(i);
        places.put(d.getString("id") + "", d);
      }

    } catch (Exception ex) {
      LOGGER.log(Level.SEVERE, "Error {0}", ex);
      ret.put("error", ex);
    }

  }

  public JSONObject update(int value, String unit) {
    LocalDateTime start = LocalDateTime.now();
    JSONObject ret = new JSONObject();

//--data-urlencode "filter[updated_at_after]=2025-05-18 09:19:02" \
//--data-urlencode "filter[updated_at_before]=2025-05-18 09:19:39" \
    String from = Instant.now().minus(value, ChronoUnit.valueOf(unit)).toString();
    LOGGER.log(Level.INFO, "Updating HIKO letters from {0}", from);
    try (SolrClient client = new HttpJettySolrClient.Builder(Options.getInstance().getString("solr")).build()) {
      //List<String> tenants = getTenants();
      
      ret.put("global-keywords", indexGlobalKeywords());
      ret.put("keywords", indexKeywords());
      ret.put("locations", indexLocations());
      ret.put("professions", indexProfessions());
      ret.put("identities", indexIdentities(null));

      initKeywords();
      initPlaces();
      initProfessions();
      Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
      for (String tenant : tenants) {
        indexLetters(client, ret, tenant, from);
      }
      client.commit("hiko");
    } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
      LOGGER.log(Level.SEVERE, "Error {0}", ex);
      ret.put("error", ex);
    }

    LocalDateTime end = LocalDateTime.now();
    ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
    LOGGER.log(Level.INFO, "Update HIKO finished. {0} letters indexed");
    return ret;
  }
  
  private void clearAll(SolrClient client, LocalDateTime start) {
    clear(client, "identities", start);
    clear(client, "keywords", start);
    clear(client, "professions", start);
    clear(client, "places", start);
    clear(client, "locations", start);
    clear(client, "hiko", start);
  }
  
  private void clear(SolrClient client, String collection, LocalDateTime start) {
    try {
      String to = dtformatter.format(start);
      System.out.println(to);
      client.deleteByQuery(collection, "indextime:[* TO " + to + "]");
    } catch (SolrServerException | IOException ex) {
      LOGGER.log(Level.SEVERE, "Error clearing index", ex);
    }
  }

  public JSONObject full() {
    LocalDateTime start = LocalDateTime.now();
    JSONObject ret = new JSONObject();
    LOGGER.log(Level.INFO, "Indexing HIKO letters");
    try (SolrClient client = new HttpJettySolrClient.Builder(Options.getInstance().getString("solr")).build()) {
      
      ret.put("places", indexPlaces());
      ret.put("global-keywords", indexGlobalKeywords());
      ret.put("keywords", indexKeywords());
      ret.put("locations", indexLocations());
      ret.put("professions", indexProfessions());
      ret.put("identities", indexIdentities(null));
      
      initKeywords();
      initPlaces();
      initProfessions();
      Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
      for (String tenant : tenants) {
        indexLetters(client, ret, tenant, null);
      }
      clearAll(client, start);
      client.commit("hiko");
    } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
      LOGGER.log(Level.SEVERE, "Error {0}", ex);
      ret.put("error", ex);
    }
    LocalDateTime end = LocalDateTime.now();
    ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
    LOGGER.log(Level.INFO, "Indexing HIKO finished. {0} letters indexed");
    return ret;
  }

  public JSONObject indexTenant(String tenant) {
    LocalDateTime start = LocalDateTime.now();
    JSONObject ret = new JSONObject();
    LOGGER.log(Level.INFO, "Indexing HIKO letters");
    try (SolrClient client = new HttpJettySolrClient.Builder(Options.getInstance().getString("solr"))
            //.useHttp1_1(true)
            .build()) {
      //List<String> tenants = getTenants();
      initKeywords();
      initPlaces();
      initProfessions();
      indexLetters(client, ret, tenant, null);
      client.commit("hiko");
    } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
      LOGGER.log(Level.SEVERE, "Error indexing tenant", ex);
      ret.put("error", ex);
    }
    LocalDateTime end = LocalDateTime.now();
    ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
    LOGGER.log(Level.INFO, "Indexing HIKO finished. {0} letters indexed");
    return ret;
  }

  public JSONObject indexLetter(String tenant, String id) {
    LocalDateTime start = LocalDateTime.now();
    JSONObject ret = new JSONObject();
    LOGGER.log(Level.INFO, "Indexing HIKO letters");
    try (SolrClient client = new HttpJettySolrClient.Builder(Options.getInstance().getString("solr"))
            .build()) {
      initKeywords();
      initPlaces();
      initProfessions();
      indexLetter(client, ret, tenant, id);
      client.commit("hiko");
    } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
      LOGGER.log(Level.SEVERE, "Error indexing tenant", ex);
      ret.put("error", ex);
    }
    LocalDateTime end = LocalDateTime.now();
    ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
    LOGGER.log(Level.INFO, "Indexing HIKO finished. {0} letters indexed");
    return ret;
  }

  private void indexLetter(SolrClient client, JSONObject ret, String tenant, String id) throws URISyntaxException, IOException, InterruptedException {
    LOGGER.log(Level.INFO, "Indexing tenant: {0}.", tenant);
    String t = tenant;
    if (Options.getInstance().getBoolean("isVaTest", true)) {
      t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
    }
    String url = Options.getInstance().getJSONObject("hiko").getString("api")
            .replace("{tenant}", t)
            + "/letter/" + id;

    int indexed = 0;
    String r = "";
    try (HttpClient httpclient = HttpClient
            .newBuilder()
            .build()) {
      HttpRequest.Builder requestB = HttpRequest.newBuilder()
              //.uri(new URI(url))
              .timeout(Duration.ofSeconds(40))
              .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
              .header("Accept", "application/json")
              .GET();

      LOGGER.log(Level.INFO, "Requesting: {0}.", url);
      HttpRequest request = requestB
              .copy()
              .uri(new URI(url))
              .build();
      HttpResponse<String> response = httpclient.send(request, BodyHandlers.ofString());
      //r = response.body();
      JSONObject resp = new JSONObject(response.body());

      JSONObject rs = resp.getJSONObject("data");
      SolrInputDocument doc = processLetter(rs, tenant);
      client.add("hiko", doc);
      client.commit("hiko");
      LOGGER.log(Level.INFO, "Letter indexed");

      ret.put(tenant, "Letter "+id+" indexed");
    } catch (Exception e) {
      LOGGER.log(Level.SEVERE, "Error indexing {0}", url);
      LOGGER.log(Level.SEVERE, "", e);
      ret.put("error" + tenant, e);
    }
  }

  private void indexLetters(SolrClient client, JSONObject ret, String tenant, String from) throws URISyntaxException, IOException, InterruptedException {
    LOGGER.log(Level.INFO, "Indexing tenant: {0}.", tenant);
    String t = tenant;
    if (Options.getInstance().getBoolean("isVaTest", true)) {
      t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
    }
    String url = Options.getInstance().getJSONObject("hiko").getString("api")
            .replace("{tenant}", t)
            //+ "/letters?page=1&include=identities,identities.localProfessions,identities.localProfessions.profession_category,identities.globalProfessions,identities.globalProfessions.profession_category,places,keywords,globalKeywords";
            + "/letters?page=1&per_page=100";
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
      HttpRequest.Builder requestB = HttpRequest.newBuilder()
              //.uri(new URI(url))
              .timeout(Duration.ofSeconds(40))
              .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
              .header("Accept", "application/json")
              .GET();
      while (url != null) {
        LOGGER.log(Level.INFO, "Requesting: {0}.", url);
        HttpRequest request = requestB
                .copy()
                .uri(new URI(url))
                .build();
        HttpResponse<String> response = httpclient.send(request, BodyHandlers.ofString());
        //r = response.body();
        JSONObject resp = new JSONObject(response.body());
        JSONArray docs = resp.getJSONArray("data");
        for (int i = 0; i < docs.length(); i++) {
          JSONObject rs = docs.getJSONObject(i);

          SolrInputDocument doc = processLetter(rs, tenant);
          client.add("hiko", doc);
          indexed++;
          if ((indexed % 500) == 0) {
            client.commit("hiko");
            LOGGER.log(Level.INFO, "Indexed {0} docs", indexed);
          }

        }
        ret.put(tenant, indexed++);
        // url = resp.optString("next_page_url", null);
        url = resp.getJSONObject("links").optString("next", null);
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

  private SolrInputDocument processLetter(JSONObject rs, String tenant) {
    SolrInputDocument doc = new SolrInputDocument();

    String id = tenant + "_" + rs.getInt("id");

    doc.addField("id", id);
    doc.addField("table_id", rs.getInt("id"));
    doc.addField("tenant", tenant);
    doc.addField("letter_id", rs.getInt("id"));
    doc.addField("status", rs.optString("status"));

    if (rs.has("abstract")) {
      doc.addField("abstract", rs.getJSONObject("abstract").toString());
      doc.addField("abstract_cs", rs.getJSONObject("abstract").optString("cs"));
      doc.addField("abstract_en", rs.getJSONObject("abstract").optString("en"));
    }
    doc.addField("incipit", rs.optString("incipit"));
    doc.addField("explicit", rs.optString("explicit"));
    if (rs.has("languages")) {
      doc.addField("languages", rs.getJSONArray("languages").toList());
    }
    doc.addField("content", rs.optString("content"));

    //LocalDate date = LocalDate.parse(rs.optString("date_computed"), dformatter);
    int date_year = rs.optInt("date_year", 0);
    int date_month = rs.optInt("date_month", 0);
    int date_day = rs.optInt("date_day", 0);
    if (date_year > 0) {
      date_month = Math.max(date_month, 1);
      date_day = Math.max(date_day, 1);
    }
    try {
      LocalDate date = LocalDate.of(date_year, date_month, date_day);
      doc.addField("date_computed", date.atStartOfDay().format(dtformatter));
    } catch (Exception ex) {
      LOGGER.log(Level.WARNING, "Error parsing date for {0}. {1}-{2}-{3}", new Object[]{id, date_year, date_month, date_day});
    }

    doc.addField("date_year", date_year);
    setPeriod(doc, date_year);
    
    
//      <field name="date_marked" type="string" indexed="true" stored="true" />
//  <field name="date_uncertain" type="boolean" indexed="true" stored="true" />
//  <field name="date_approximate" type="boolean" indexed="true" stored="true" />
//  <field name="date_inferred" type="boolean" indexed="true" stored="true" />
//  <field name="date_is_range" type="boolean" indexed="true" stored="true" />
//  <field name="date_note" type="string" indexed="true" stored="true" />
//          

    addPlaces(rs.getJSONArray("origins"), "origin", doc, tenant);
    addPlaces(rs.getJSONArray("destinations"), "destination", doc, tenant);
    addIdentities(rs.getJSONArray("authors"), "author", doc, tenant);
    addIdentities(rs.getJSONArray("recipients"), "recipient", doc, tenant);
    addIdentities(rs.getJSONArray("mentioned"), "mentioned", doc, tenant);
    addKeywords(rs.optJSONArray("keywords"), doc, tenant);
    return doc;
  }

  private void setPeriod(SolrInputDocument doc, int date_year) {
    String period = "unknown";
    if (date_year > 1500 && date_year <= 1800) {
      period = "1";
    } else if (date_year > 1800 && date_year <= 1939) {
      period = "2";
    } else if (date_year > 1939) {
      period = "3";
    }
    doc.setField("period", period);
  }

  private void addKeywords(JSONArray keywords, SolrInputDocument doc, String tenant) {
    /**
     *
     * "keywords": [ { "id": 74, "scope": "local", "reference": "local-74",
     * "name_cs": "Mistni klicove slovo", "name_en": "Local keyword", "type":
     * "L." }, { "id": 10442, "scope": "global", "reference": "global-10442",
     * "name_cs": "Global klicove slovo", "name_en": "Global keyword", "type":
     * "G." } ],
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
        JSONObject c = keywordCategories.getJSONObject(keyword_id);
        if (!doc.containsKey("keywords_category_cs") || !doc.getFieldValues("keywords_category_cs").contains(c.optString("category_cs"))) {
          doc.addField("keywords_category_cs", c.optString("category_cs"));
          doc.addField("keywords_category_en", c.optString("category_en"));
        }
      }
      doc.addField("keywords", rs.toString());
    }
  }

  private void addPlaces(JSONArray lplaces, String role, SolrInputDocument doc, String tenant) {

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
      doc.addField("place_names", pl.optString("name"));
      doc.addField("name", pl.optString("name"));
      doc.addField("country", pl.optString("country"));
      doc.addField("note", pl.optString("note"));
      doc.addField("latitude", pl.optFloat("latitude"));
      doc.addField("longitude", pl.optFloat("longitude"));
      doc.addField("geoname_id", pl.optInt("geoname_id"));
      doc.addField("division", pl.optString("division"));
      pl.put("role", role);
      if (!Float.isNaN(pl.optFloat("latitude"))) {
        doc.addField("coords", pl.optFloat("latitude") + "," + pl.optFloat("longitude"));
      }
      if ("origin".equals(role)) {
        doc.setField("origin", rs.getInt("id"));
        doc.setField("origin_id", place_id);
        doc.setField("origin_name", pl.optString("name"));
      }
      if ("destination".equals(role)) {
        doc.setField("destination", rs.getInt("id"));
        doc.setField("destination_id", place_id);
        doc.setField("destination_name", pl.optString("name"));
      }
      doc.addField("places", pl.toString());
    }
  }

  private void addIdentities(JSONArray identities, String role, SolrInputDocument doc, String tenant) {
    
//    "mentioned": [
//      {
//        "id": 428,
//        "scope": "local",
//        "reference": "local-428",
//        "name": "Kvíčala, Jan",
//        "marked": null,
//        "salutation": null,
//        "global_identity": {
//          "id": 66101,
//          "scope": "global",
//          "reference": "global-66101",
//          "name": "Kvíčala, Jan",
//          "type": "person",
//          "birth_year": "1834",
//          "death_year": "1908"
//        }
//      },
//      ...
//      ]

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
      JSONObject gi = rs.optJSONObject("global_identity");
      if (gi != null) {
        identity.put("global_identity", gi);
        doc.addField("global_identity_id", gi.getInt("id"));
        doc.addField("identity_name", gi.getString("name"));
      }

      identity.put("professions", addProfessions(id, role, doc, tenant));
      //JSONArray ps = addProfessions(id, role, doc, tenant);
      doc.addField("identities", identity.toString());
 
    }
  }

  private JSONArray addProfessions(String identityId, String role, SolrInputDocument doc, String tenant) {
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
      // rs.append("professions", k);
      doc.addField("professions", k.toString());
    }
    return lprofessions;
  }
  
  
  
  
  

    JSONObject globalKeywordCategories = new JSONObject();
    JSONObject globalProfessionCategories = new JSONObject();

    private void initKeywordCategories(String tenant, boolean isGlobal) throws URISyntaxException, IOException, InterruptedException {
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t);
        if (isGlobal) {
            url += "/global-keyword-categories?per_page=100";
        } else {
            url += "/keyword-categories?per_page=100";
        }
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(url))
                .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                .GET()
                .build();

        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
            JSONArray docs = new JSONObject(response.body()).getJSONArray("data");
            for (int i = 0; i < docs.length(); i++) {
                JSONObject d = docs.getJSONObject(i);
                globalKeywordCategories.put((isGlobal ? "global" : tenant) + "-" + d.getInt("id"), d);
            }
        }
    }

    private void initProfessionCategories(String tenant, boolean isGlobal) throws URISyntaxException, IOException, InterruptedException {
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t);
        if (isGlobal) {
            url += "/global-profession-categories?per_page=100";
        } else {
            url += "/profession-categories?per_page=100";
        }
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(url))
                .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                .GET()
                .build();

        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
            JSONArray docs = new JSONObject(response.body()).getJSONArray("data");
            for (int i = 0; i < docs.length(); i++) {
                JSONObject d = docs.getJSONObject(i);
                globalProfessionCategories.put((isGlobal ? "global" : tenant) + "-" + d.getInt("id"), d);
            }
        }
    }

    
    public JSONObject indexIdentities(String rtenant) throws URISyntaxException, IOException, InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO identities");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) { 
          if(rtenant == null || "global".equals(rtenant)){
            indexTenantIdentities(client, ret, "global");
          } 
          Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
          for (String tenant : tenants) {
              if (rtenant == null || rtenant.equals(tenant)) {
                  indexTenantIdentities(client, ret, tenant);
              }
          }
          client.commit("identities");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing identities", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO identities FINISHED");
        return ret;
    }

    public JSONObject indexTenant(String tenant, String type) throws URISyntaxException, IOException, InterruptedException {
        LOGGER.log(Level.INFO, "Indexing tenant {0} -> {1}", new Object[]{tenant, type});
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            if ("all".equals(type) || "identities".equals(type)) {
                JSONObject identities = new JSONObject();
                indexTenantIdentities(client, identities, tenant);
                indexTenantIdentities(client, identities, "global");
                ret.put("identities", identities);
                client.commit("identities");
            }

            if ("all".equals(type) || "keywords".equals(type)) {
                JSONObject keywords = new JSONObject();
                indexTenantKeywords(client, keywords, tenant);
                indexGlobalKeywords(client, keywords, tenant);
                ret.put("keywords", keywords);
                client.commit("keywords");
            }

            if ("all".equals(type) || "locations".equals(type)) {

                JSONObject locations = new JSONObject();
                indexTenantLocations(client, locations, tenant);
                indexTenantLocations(client, locations, "global");
                ret.put("locations", locations);
                client.commit("locations");
            }

            if ("all".equals(type) || "places".equals(type)) {

                JSONObject places = new JSONObject();
                indexGlobalPlaces();
                indexTenantPlaces(client, places, tenant);
                ret.put("places", places);
                client.commit("places");
            }

        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing tenant", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing tenant {0} -> {1} FINISHED", new Object[]{tenant, type});
        return ret;

    }
    
    public static String normalize(String input) {
        if (input == null) {
            return "";
        }
        String result = input.toLowerCase(Locale.ROOT);
        result = Normalizer.normalize(result, Normalizer.Form.NFD);
        result = result.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        result = result.replaceAll("[^a-z0-9]", "");
        return result;
    }

    private void indexTenantIdentities(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException, SolrServerException {
        String t = tenant;
        if (tenant.equals("global")) {
            t = "brezina"; //jakykoli
        }
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(t);
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t);
        if (tenant.equals("global")) {
            url += "/global-identities";
        } else {
            url += "/identities";
        }
        int tindexed = 0;
        
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                LOGGER.log(Level.INFO, "Indexing tenant {0} -> {1}", new Object[]{tenant, url});
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.optJSONArray("data");
                if (docs == null) {
                  LOGGER.log(Level.INFO, "Url {0} return no data", new Object[]{url});
                  url = null;
                  continue;
                }
                for (int i = 0; i < docs.length(); i++) {
                    JSONObject rs = docs.getJSONObject(i);

                    SolrInputDocument doc = new SolrInputDocument();

                    String id = tenant + "_" + rs.getInt("id");

                    doc.addField("id", id);
                    doc.addField("table_id", rs.getInt("id"));
                    doc.addField("tenant", tenant);
                    doc.addField("name", rs.optString("name"));
                    doc.addField("surname", rs.optString("surname"));
                    doc.addField("forename", rs.optString("forename"));
                    doc.addField("nationality", rs.optString("nationality"));
                    doc.addField("gender", rs.optString("gender"));
                    doc.addField("birth_year", rs.optString("birth_year"));
                    doc.addField("death_year", rs.optString("death_year"));
                    
                    String normalized = normalize(rs.optString("name", "") + rs.optString("birth_year", "") + rs.optString("death_year", ""));
                    doc.addField("name_normalized", normalized);

                    doc.addField("key_tagger_cs", rs.optString("name")); 
                    if (rs.optString("surname").length() > 2) {
                        doc.addField("key_tagger_cs", rs.optString("surname"));
                    }

                    /**
                     *
                     * "professions": [ { "id": 221, "scope": "global",
                     * "reference": "global-221", "name": { "cs": "pedagog (i
                     * odborný), učitel (bez specifikace) ", "en": " pedagogue"
                     * }, "category_id": 10 } ]
                     */
                    JSONArray japrofessions = rs.optJSONArray("professions");
                    if (japrofessions != null) {
                        for (int k = 0; k < japrofessions.length(); k++) {
                            JSONObject p = japrofessions.getJSONObject(k);
                            doc.addField("professions", p.toString());
                            doc.addField("professions_cs", p.getJSONObject("name").optString("cs"));
                            doc.addField("professions_en", p.getJSONObject("name").optString("en"));
                            doc.addField("professions_category", p.optInt("category_id"));
                        }
                    }
                    
                    JSONArray rnja = rs.optJSONArray("related_names");
                    if (rnja != null) {
                        for (int k = 0; k < rnja.length(); k++) {
                            JSONObject ans = rnja.getJSONObject(k);
                            String name = ans.optString("surname", "") + " " + ans.optString("forename", "");
                            doc.addField("related_names", name);
                        }
                    } 

                    JSONArray anja = rs.optJSONArray("alternative_names");
                    if (anja != null) {
                        for (int k = 0; k < anja.length(); k++) {
                            String ans = anja.getString(k);
                            doc.addField("alternative_names", ans);
                            if (ans.length() > 2) {
                                doc.addField("key_tagger_cs", ans);
                            }
                        }
                    } else {
                        String an = rs.optString("alternative_names", null);
                        if (an != null) {
                            try {
                                JSONObject anjs = new JSONObject(an);
                                for (String key : anjs.keySet()) {
                                    String ans = anjs.getString(key);
                                    doc.addField("alternative_names", ans);
                                    if (ans.length() > 2) {
                                        doc.addField("key_tagger_cs", ans);
                                    }
                                }
                            } catch (JSONException jsonex) {
                                LOGGER.log(Level.WARNING, "Invalid JSON for {0}", id);
                            }
                        }
                    }

                    doc.addField("type", rs.getString("type"));

                    client.add("identities", doc);
                    ret.put(tenant, tindexed++);
                    
                        client.commit("identities");
                        LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
                    

                }
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
        }
    }

    public JSONObject indexPlaces() throws URISyntaxException, IOException, InterruptedException {
      //  LocalDateTime start = LocalDateTime.now();
      LocalDateTime start = LocalDateTime.now();
      String to = dtformatter.format(start);
      System.out.println(to);
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO places");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            indexGlobalPlaces(client, ret);
//            Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
//            for (String tenant : tenants) {
//                indexTenantPlaces(client, ret, tenant);
//            }
            clear(client, "places", start);
            client.commit("places");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing places", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO places FINISHED");
        return ret;

    }

    public void indexTenantPlaces(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException, SolrServerException {
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t)
                + "/places";
        int tindexed = 0;
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                LOGGER.log(Level.INFO, "Indexing tenant {0} -> {1}", new Object[]{tenant, url});
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.getJSONArray("data");
                List<SolrInputDocument> idocs = new ArrayList();
                for (int i = 0; i < docs.length(); i++) {
                    JSONObject rs = docs.getJSONObject(i);
                    SolrInputDocument doc = processPlace(rs, tenant);
                    idocs.add(doc);
                    ret.put(tenant, tindexed++);
                }
                if (!idocs.isEmpty()) {  
                    client.add("places", idocs);
                    client.commit("places");
                    idocs.clear();
                    LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
                }
                ret.put(tenant, tindexed);
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
        } catch (Exception ex) {
            ret.put(tenant, ex.toString());
            LOGGER.log(Level.SEVERE, "Error in tenant {0}", tenant);
            LOGGER.log(Level.SEVERE, "Error is {0}", ex);
        }
    }

    public JSONObject indexGlobalPlaces() throws URISyntaxException, IOException, InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO global PLACES");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            JSONArray tenants = Options.getInstance().getJSONObject("test_mappings").names();
            indexGlobalPlaces(client, ret);

            client.commit("places");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing global places", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO PLACES FINISHED");
        return ret;

    }

    private void indexGlobalPlaces(SolrClient client, JSONObject ret) throws URISyntaxException, IOException, InterruptedException, SolrServerException {
        String t = "brezina";
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString("brezina");
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t)
                + "/global-places?per_page=100";
        int tindexed = 0;
        LOGGER.log(Level.INFO, "Indexing global places {0} -> {1}", new Object[]{t, url});
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.getJSONArray("data");
                for (int i = 0; i < docs.length(); i++) {
                    JSONObject rs = docs.getJSONObject(i);
                    SolrInputDocument doc = processPlace(rs, "global");
                    client.add("places", doc);
                    ret.put("global", tindexed++);
                }
                client.commit("places");
                LOGGER.log(Level.INFO, "Global {0} docs", tindexed);
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
        } catch (Exception ex) {
            ret.put("global", ex.toString());
            LOGGER.log(Level.SEVERE, "Error in tenant {0} -> {1}", new Object[]{t, ex.toString()});
        }
    }

    private SolrInputDocument processPlace(JSONObject rs, String tenant) {
        SolrInputDocument doc = new SolrInputDocument();

        String id = tenant + "_" + rs.getInt("id");

        doc.addField("id", id);
        doc.addField("table_id", rs.getInt("id"));
        doc.addField("tenant", tenant);
        doc.addField("name", rs.getString("name"));
        doc.addField("country", rs.optString("country"));
        doc.addField("note", rs.optString("note"));
        doc.addField("latitude", rs.optFloat("latitude"));
        doc.addField("longitude", rs.optFloat("longitude"));
        doc.addField("geoname_id", rs.optInt("geoname_id"));
        doc.addField("division", rs.optString("division"));
        if (!Float.isNaN(rs.optFloat("latitude"))) {
            doc.addField("coords", rs.optFloat("latitude") + "," + rs.optFloat("longitude"));
        }

        JSONArray an = rs.optJSONArray("alternative_names");
        if (an != null) {
            for (int j = 0; j < an.length(); j++) {
                doc.addField("alternative_names", an.getString(j));
            }
        }

        return doc;
    }

    public JSONObject indexLocations() throws URISyntaxException, IOException, InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO locations");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
            for (String tenant : tenants) {
                indexTenantLocations(client, ret, tenant);
            }

            client.commit("locations");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing locations", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO locations FINISHED");
        return ret;

    }

    private void indexTenantLocations(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException, SolrServerException {

        String t = tenant;
        if (tenant.equals("global")) {
            t = "brezina"; //jakykoli
        }
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(t);
        }
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t);
        if (tenant.equals("global")) {
            url += "/global-locations?per_page=100";
        } else {
            url += "/locations?per_page=100";
        }
        int tindexed = 0;
        LOGGER.log(Level.INFO, "Indexing tenant {0} -> {1}", new Object[]{tenant, url});
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.getJSONArray("data");
                for (int i = 0; i < docs.length(); i++) {
                    JSONObject rs = docs.getJSONObject(i);

                    SolrInputDocument doc = new SolrInputDocument();

                    String id = tenant + "_" + rs.getInt("id");

                    doc.addField("id", id);
                    doc.addField("table", t);
                    doc.addField("table_id", rs.getInt("id"));
                    doc.addField("tenant", tenant);
                    doc.addField("name", rs.getString("name"));
                    doc.addField("type", rs.optString("type"));
                    client.add("locations", doc);
                    ret.put(tenant, tindexed++);
                    if (tindexed % 500 == 0) {
                        client.commit("locations");
                        LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
                    }

                }
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
            client.commit("locations");
            LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
        }
    }

    public JSONObject indexGlobalKeywords() throws URISyntaxException, IOException, InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO global keywords");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            JSONArray tenants = Options.getInstance().getJSONObject("test_mappings").names();
            indexGlobalKeywords(client, ret, tenants.getString(0));
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing global keywords", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO keywords FINISHED");
        return ret;

    }

    private void indexGlobalKeywords(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException, SolrServerException {
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant); 
        }
        initKeywordCategories(tenant, true);
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t)
                + "/global-keywords?per_page=100";
        int tindexed = 0;
        LOGGER.log(Level.INFO, "Indexing keywords tenant {0} -> {1}", new Object[]{tenant, url});
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.getJSONArray("data");
                processKeywords(client, ret, "global", docs, t);
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
            client.commit("keywords");
            LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
        }
    }

    public JSONObject indexKeywords() {
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO keywords");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
            for (String tenant : tenants) {
              try {
                indexTenantKeywords(client, ret, tenant);
              } catch (URISyntaxException | IOException | InterruptedException ex) {
                LOGGER.log(Level.SEVERE, "Error indexing keywords", ex);
              }
            }

            client.commit("keywords");
        } catch (SolrServerException | IOException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing keywords", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO keywords FINISHED");
        return ret;

    }

    private void indexTenantKeywords(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException, SolrServerException {
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        initKeywordCategories(tenant, false);
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t)
                + "/keywords?per_page=100";
        int tindexed = 0;
        LOGGER.log(Level.INFO, "Indexing keywords tenant {0} -> {1}", new Object[]{tenant, url});
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.getJSONArray("data");
                processKeywords(client, ret, tenant, docs, t);
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
            client.commit("keywords");
            LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
        }
    }

    private void processKeywords(SolrClient client, JSONObject ret, String tenant, JSONArray docs, String table) throws URISyntaxException, IOException, InterruptedException, SolrServerException {

        for (int i = 0; i < docs.length(); i++) {
            JSONObject rs = docs.getJSONObject(i);

            SolrInputDocument doc = new SolrInputDocument();

            String id = tenant + "_" + rs.getInt("id");

            doc.addField("id", id);
            doc.addField("table", table);
            doc.addField("table_id", rs.getInt("id"));
            doc.addField("tenant", tenant);
            doc.addField("type", rs.optString("type"));
            if (rs.has("category_id")) {
                int category_id = rs.optInt("category_id");
                doc.addField("category_id", category_id);
                if (globalKeywordCategories.has(tenant + "-" + category_id)) {
                    doc.addField("category_cs", globalKeywordCategories.getJSONObject(tenant + "-" + category_id).getJSONObject("name").getString("cs"));
                    doc.addField("category_en", globalKeywordCategories.getJSONObject(tenant + "-" + category_id).getJSONObject("name").getString("en"));
                }
            }

            JSONObject name = rs.getJSONObject("name");
            doc.addField("name_cs", name.getString("cs"));
            doc.addField("name_en", name.getString("en"));

            doc.addField("key_tagger_cs", name.getString("cs"));
            doc.addField("key_tagger_en", name.getString("en"));

            client.add("keywords", doc);

        }
        client.commit("keywords");
        LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, docs.length()});
    }

    public JSONObject indexGlobalProfessions() throws URISyntaxException, IOException, InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO global Professions");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            JSONArray tenants = Options.getInstance().getJSONObject("test_mappings").names();
            indexGlobalProfessions(client, ret, tenants.getString(0));
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing global Professions", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO Professions FINISHED");
        return ret;

    }

    private void indexGlobalProfessions(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException, SolrServerException {
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        initProfessionCategories(tenant, true);
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t)
                + "/global-professions?per_page=100";
        int tindexed = 0;
        LOGGER.log(Level.INFO, "Indexing Professions tenant {0} -> {1}", new Object[]{tenant, url});
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.getJSONArray("data");
                processProfessions(client, ret, "global", docs, t);
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
            client.commit("professions");
            LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
        }
    }

    public JSONObject indexProfessions() throws URISyntaxException, IOException, InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        JSONObject ret = new JSONObject();
        LOGGER.log(Level.INFO, "Indexing HIKO Professions");
        try (SolrClient client = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            Set<String> tenants = Options.getInstance().getJSONObject("test_mappings").keySet();
            for (String tenant : tenants) {
                indexTenantProfessions(client, ret, tenant);
            }

            client.commit("professions");
        } catch (URISyntaxException | InterruptedException | IOException | SolrServerException ex) {
            LOGGER.log(Level.SEVERE, "Error indexing Professions", ex);
            ret.put("error", ex);
        }
        LocalDateTime end = LocalDateTime.now();
        ret.put("ellapsed time", DurationFormatUtils.formatDurationHMS(Duration.between(end, start).toMillis()));
        LOGGER.log(Level.INFO, "Indexing HIKO Professions FINISHED");
        return ret;

    }

    private void indexTenantProfessions(SolrClient client, JSONObject ret, String tenant) throws URISyntaxException, IOException, InterruptedException, SolrServerException {
        String t = tenant;
        if (Options.getInstance().getBoolean("isVaTest", true)) {
            t = Options.getInstance().getJSONObject("test_mappings").getString(tenant);
        }
        initKeywordCategories(tenant, false);
        String url = Options.getInstance().getJSONObject("hiko").getString("api")
                .replace("{tenant}", t)
                + "/professions?per_page=100";
        int tindexed = 0;
        LOGGER.log(Level.INFO, "Indexing keywords tenant {0} -> {1}", new Object[]{tenant, url});
        try (HttpClient httpclient = HttpClient
                .newBuilder()
                .build()) {
            while (url != null) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(new URI(url))
                        .header("Authorization", Options.getInstance().getJSONObject("hiko").getString("bearer"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpclient.send(request, HttpResponse.BodyHandlers.ofString());
                JSONObject resp = new JSONObject(response.body());
                JSONArray docs = resp.getJSONArray("data");
                processProfessions(client, ret, tenant, docs, t);
                url = resp.getJSONObject("links").optString("next", null);
                Thread.sleep(1000);
            }
            client.commit("professions");
            LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, tindexed});
        }
    }

    private void processProfessions(SolrClient client, JSONObject ret, String tenant, JSONArray docs, String table) throws URISyntaxException, IOException, InterruptedException, SolrServerException {

        for (int i = 0; i < docs.length(); i++) {
            JSONObject rs = docs.getJSONObject(i);

            SolrInputDocument doc = new SolrInputDocument();

            String id = tenant + "_" + rs.getInt("id");

            doc.addField("id", id);
            doc.addField("table", table);
            doc.addField("table_id", rs.getInt("id"));
            doc.addField("tenant", tenant);
            doc.addField("type", rs.optString("type"));
            if (rs.has("category_id")) {
                int category_id = rs.optInt("category_id");
                doc.addField("category_id", category_id);
                if (globalProfessionCategories.has(tenant + "-" + category_id)) {
                    doc.addField("category_cs", globalProfessionCategories.getJSONObject(tenant + "-" + category_id).getJSONObject("name").getString("cs"));
                    doc.addField("category_en", globalProfessionCategories.getJSONObject(tenant + "-" + category_id).getJSONObject("name").getString("en"));
                }
            }

            JSONObject name = rs.getJSONObject("name");
            doc.addField("name_cs", name.getString("cs"));
            doc.addField("name_en", name.getString("en"));

            doc.addField("key_tagger_cs", name.getString("cs"));
            doc.addField("key_tagger_en", name.getString("en"));

            client.add("professions", doc);

        }
        client.commit("professions");
        LOGGER.log(Level.INFO, "Tenant {0} -> {1} docs", new Object[]{tenant, docs.length()});
    }
}
