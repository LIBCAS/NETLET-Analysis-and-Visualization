package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import jakarta.servlet.http.HttpServletRequest;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.client.solrj.SolrQuery;
import org.apache.solr.client.solrj.impl.Http2SolrClient;
import org.apache.solr.client.solrj.impl.NoOpResponseParser;
import org.apache.solr.client.solrj.request.QueryRequest;
import org.apache.solr.client.solrj.request.json.JsonQueryRequest;
import org.apache.solr.client.solrj.request.json.TermsFacetMap;
import org.apache.solr.client.solrj.response.QueryResponse;
import org.apache.solr.common.util.NamedList;
import org.json.JSONObject;

/**
 *
 * @author alberto
 */
public class Indexer {

    public static final Logger LOGGER = Logger.getLogger(Indexer.class.getName());

    public static JSONObject getTenants() {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
//            SolrQuery query = new SolrQuery("*")
//                    .setRows(0)
//                    .setFacet(true)
//                    .addFacetField("tenant")
//                    .setParam("json.nl", "map")
//                    .setFacetMinCount(0)
//                    .setFacetLimit(1000);
//            query.set("wt", "json");
//            ret = new JSONObject(solr.query("letter_place", query).jsonStr());

            final TermsFacetMap tenantFacet = new TermsFacetMap("tenant")
                    .setLimit(100)
                    .setMinCount(0)
                    .withStatSubFacet("date_year_min", "min(date_year)")
                    .withStatSubFacet("date_year_max", "max(date_year)");
           
            
            final JsonQueryRequest request = new JsonQueryRequest()
                    .setQuery("*:*")
                    .withFilter("-date_year:0")
                    .setLimit(0)
                    .withFacet("tenant", tenantFacet);
            
            QueryResponse queryResponse = request.process(solr, "letter_place");
            ret = new JSONObject(queryResponse.jsonStr());
//           
//            final JsonQueryRequest request =
//    new JsonQueryRequest()
//        .setQuery("*")
//        .withFilter("inStock:true")
//        .withStatFacet("avg_price", "avg(price)")
//        .withStatFacet("min_manufacturedate_dt", "min(manufacturedate_dt)")
//        .withStatFacet("num_suppliers", "unique(manu_exact)")
//        .withStatFacet("median_weight", "percentile(weight,50)");
//QueryResponse queryResponse = request.process(solrClient, COLLECTION_NAME);
        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

    public static JSONObject getPlaces(String tenant) {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            SolrQuery query = new SolrQuery("*")
                    .setRows(1000);
            if (tenant != null && !tenant.isBlank()) {
                query.addFilterQuery("tenant:" + tenant);
            }
            query.set("wt", "json");
            
            ret = new JSONObject(solr.query("letter_place", query).jsonStr());

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

    public static JSONObject getLetters(HttpServletRequest request) {
        JSONObject ret = new JSONObject();
        NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
        rawJsonResponseParser.setWriterType("json");
        try (SolrClient solr = new Http2SolrClient.Builder(Options.getInstance().getString("solr"))
                .withResponseParser(rawJsonResponseParser)
                .build()) {

            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            SolrQuery query = new SolrQuery("*")
                    .setRows(10000)
                    .setFields("*,places:[json],identities:[json]")
                    .setFacet(true)
                    .addFilterQuery("latitude:*")
                    .addFacetField("identity_author")
                    .addFacetField("identity_recipient")
                    .addFacetField("identity_mentioned")
                    .setParam("wt", "json")
                    .setParam("json.nl", "arrntv")
                    .setParam("facet.range", "{!ex=ffdate_year}date_year")
                    .setParam("f.date_year.facet.range.start", years[0])
                    .setParam("f.date_year.facet.range.end", years[1])
                    .setParam("f.date_year.facet.range.gap", "1")
                    // .setParam("f.date_year.facet.range.include", "lower")
                    .setParam("f.date_year.facet.range.other", "after")
                    .setParam("stats", true)
                    .setParam("stats.field", "latitude","longitude");

            String tenant = request.getParameter("tenant");
            if (tenant != null && !tenant.isBlank()) {
                query.addFilterQuery("tenant:" + tenant);
            }
            String date_range = request.getParameter("date_range");
            if (date_range != null && !date_range.isBlank()) {
                query.addFilterQuery("{!tag=ffdate_year}date_year:[" + date_range.replaceAll(",", " TO ") + "]");
            }

            QueryRequest req = new QueryRequest(query);

            rawJsonResponseParser.setWriterType("json");
            req.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(req, "letter_place");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

}
