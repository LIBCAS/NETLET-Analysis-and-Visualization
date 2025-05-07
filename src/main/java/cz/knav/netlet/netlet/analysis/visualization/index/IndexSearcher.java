package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.client.solrj.SolrQuery;
import org.apache.solr.client.solrj.impl.Http2SolrClient;
import org.apache.solr.client.solrj.impl.NoOpResponseParser;
import org.apache.solr.client.solrj.request.QueryRequest;
import org.apache.solr.client.solrj.request.json.JsonQueryRequest;
import org.apache.solr.client.solrj.request.json.RangeFacetMap;
import org.apache.solr.client.solrj.request.json.TermsFacetMap;
import org.apache.solr.client.solrj.response.QueryResponse;
import org.apache.solr.common.util.NamedList;
import org.json.JSONObject;

/**
 *
 * @author alberto
 */
public class IndexSearcher {

    public static final Logger LOGGER = Logger.getLogger(IndexSearcher.class.getName());

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

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

    public static JSONObject getKeywords(HttpServletRequest request) {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            final TermsFacetMap keywords_csFacet = new TermsFacetMap("keywords_cs")
                    .setLimit(100)
                    .setMinCount(1);

            final TermsFacetMap categories_csFacet = new TermsFacetMap("keywords_category_cs")
                    .setLimit(100)
                    .setMinCount(1)
                    .withSubFacet("keywords", keywords_csFacet);

            final TermsFacetMap identity_mentionedFacet = new TermsFacetMap("identity_mentioned")
                    .setLimit(100)
                    .setMinCount(1);
                            
            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            RangeFacetMap rangeFacet = new RangeFacetMap("date_year", Long.parseLong(years[0]), Long.parseLong(years[1]), 1)
                    .setOtherBuckets(RangeFacetMap.OtherBuckets.AFTER);

            String rowsP = request.getParameter("rows");
            int rows = 0;
            if (rowsP != null && !rowsP.isBlank()) {
                rows = Integer.valueOf(rowsP);
            } 

        NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
        rawJsonResponseParser.setWriterType("json");
            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    .setLimit(rows)
                    .returnFields("date_year,identity_name,identity_recipient,origin,destination,places:[json],identities:[json]")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("keywords_cs", keywords_csFacet)
                    .withFacet("keywords_categories", categories_csFacet)
                    .withFacet("identity_mentioned", identity_mentionedFacet)
                    .withFacet("identity_recipient", new TermsFacetMap("identity_recipient")
                                .setLimit(100)
                                .setMinCount(1))
                    .withFacet("identity_author", new TermsFacetMap("identity_author")
                                .setLimit(100)
                                .setMinCount(1))
                    
                    ;
            String tenant = request.getParameter("tenant");
            if (tenant != null && !tenant.isBlank()) {
                jrequest = jrequest.withFilter("tenant:" + tenant);
            }
            String date_range = request.getParameter("date_range");
            if (date_range != null && !date_range.isBlank()) {
                jrequest = jrequest.withFilter("{!tag=ffdate_year}date_year:[" + date_range.replaceAll(",", " TO ") + "]");
            }

            if (request.getParameter("keyword") != null) {
                jrequest = jrequest.withFilter("{!tag=ffkeywords}keywords_category_cs:(+\"" + String.join("\" +\"", request.getParameterValues("keyword")) + "\")");
            }
//            QueryResponse queryResponse = jrequest.process(solr, "letter_place");
//            ret = new JSONObject(queryResponse.jsonStr());
            
            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "letter_place");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);
            
            
        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

    public static JSONObject getMapLetters(HttpServletRequest request) {
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
                    .setFields("date_year,identity_name,identity_recipient,origin,destination,places:[json],identities:[json]")
                    .setFacet(true)
                    .addFilterQuery("latitude:*")
                    .addFacetField("identity_author")
                    .addFacetField("identity_recipient")
                    .addFacetField("identity_mentioned")
                    .addFacetField("{!ex=ffkeywords}keywords_cs")
                    .setParam("facet.mincount", "1")
                    .setParam("f.identity_mentioned.facet.mincount", "1")
                    .setParam("f.identity_recipient.facet.mincount", "1")
                    .setParam("wt", "json")
                    .setParam("json.nl", "arrntv")
                    .setParam("facet.range", "{!ex=ffdate_year}date_year")
                    .setParam("f.date_year.facet.range.start", years[0])
                    .setParam("f.date_year.facet.range.end", years[1])
                    .setParam("f.date_year.facet.range.gap", "1")
                    .setParam("f.date_year.facet.range.other", "after")
                    .setParam("stats", true)
                    .setParam("stats.field", "latitude", "longitude");

            String rows = request.getParameter("rows");
            if (rows != null && !rows.isBlank()) {
                query.setRows(Integer.valueOf(rows));
            } else {
                query.setRows(10000);
            }

            String tenant = request.getParameter("tenant");
            if (tenant != null && !tenant.isBlank()) {
                query.addFilterQuery("tenant:" + tenant);
            }
            String date_range = request.getParameter("date_range");
            if (date_range != null && !date_range.isBlank()) {
                query.addFilterQuery("{!tag=ffdate_year}date_year:[" + date_range.replaceAll(",", " TO ") + "]");
            }

            if (request.getParameter("keyword") != null) {
                query.addFilterQuery("{!tag=ffkeywords}keywords_cs:(+\"" + String.join("\" +\"", request.getParameterValues("keyword")) + "\")");
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
