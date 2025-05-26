package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import jakarta.servlet.http.HttpServletRequest;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.client.solrj.impl.Http2SolrClient;
import org.apache.solr.client.solrj.impl.NoOpResponseParser;
import org.apache.solr.client.solrj.request.json.DomainMap;
import org.apache.solr.client.solrj.request.json.JsonFacetMap;
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

            final TermsFacetMap tenantFacet = new TermsFacetMap("tenant")
                    .setLimit(100)
                    .setMinCount(0)
                    .withStatSubFacet("date_year_min", "min(date_year)")
                    .withStatSubFacet("date_year_max", "max(date_year)");

            final JsonQueryRequest request = new JsonQueryRequest()
                    .setQuery("*:*")
                    //.withFilter("status:publish")
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
            String lang = request.getParameter("lang");
            if (lang == null) {
                lang = "cs";
            }

            final TermsFacetMap identity_mentionedFacet = new TermsFacetMap("identity_mentioned")
                    .setLimit(100)
                    .setMinCount(1);

            final TermsFacetMap keywords_csFacet = new TermsFacetMap("keywords_"+lang)
                    .setLimit(100)
                    .setMinCount(1)
                    .withSubFacet("identities", identity_mentionedFacet);

            final TermsFacetMap categoriesFacet = new TermsFacetMap("keywords_category_"+lang)
                    .setLimit(100)
                    .setMinCount(1)
                    //.setSort("index")
                    .withSubFacet("keywords", keywords_csFacet);

            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            RangeFacetMap rangeFacet = new RangeFacetMap("date_year", Long.parseLong(years[0]), Long.parseLong(years[1]), 1)
                    .setOtherBuckets(RangeFacetMap.OtherBuckets.AFTER);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    .withFilter("keywords_category_"+lang+":*")
                    //.withFilter("status:publish")
                    .setLimit(0)
                    .returnFields("date_year,identity_name,identity_recipient,identity_author,origin,destination,places:[json],identities:[json],keywords_category_"+lang+",keywords_"+lang+"")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("tenants", new TermsFacetMap("tenant")
                            .setLimit(100)
                            .withDomain(new DomainMap()
                                    .withQuery("keywords_category_"+lang+":*")
                                    //.withTagsToExclude("fftenant")
                            )
                            .setMinCount(1))
                    .withFacet("keywords_categories", categoriesFacet)
                    // .withFacet("identity_mentioned", identity_mentionedFacet)
                    .withFacet("identity_recipient", new TermsFacetMap("identity_recipient")
                            .setLimit(100)
                            .setMinCount(1))
                    .withFacet("identity_author", new TermsFacetMap("identity_author")
                            .setLimit(100)
                            .setMinCount(1));
            String tenant = request.getParameter("tenant");
            if (tenant != null && !tenant.isBlank()) {
                jrequest = jrequest.withFilter("{!tag=fftenant}tenant:" + tenant);
            }
            String date_range = request.getParameter("date_range");
            if (date_range != null && !date_range.isBlank()) {
                jrequest = jrequest.withFilter("{!tag=ffdate_year}date_year:[" + date_range.replaceAll(",", " TO ") + "]");
            }

            if (request.getParameter("keyword") != null) {
                jrequest = jrequest.withFilter("{!tag=ffkeywords}keywords_category_"+lang+":(+\"" + String.join("\" +\"", request.getParameterValues("keyword")) + "\")");
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
                    //.withFilter("status:publish")
                    .setLimit(rows)
                    .withFilter("origin:*")
                    .withFilter("destination:*")
                    .returnFields("date_year,identity_name,identity_recipient,identity_author,origin,destination,places:[json],identities:[json],keywords_category_cs,keywords_cs")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("keywords_cs", keywords_csFacet)
                    .withFacet("keywords_categories", categories_csFacet)
                    .withFacet("identity_mentioned", identity_mentionedFacet)
                    .withFacet("tenants", new TermsFacetMap("tenant")
                            .setLimit(100)
                            .withDomain(new DomainMap()
                                    .withQuery("origin:* AND destination:*")
                                    //.withTagsToExclude("fftenant")
                            )
                            .setMinCount(1))
                    .withFacet("identity_recipient", new TermsFacetMap("identity_recipient")
                            .setLimit(100)
                            .setMinCount(1))
                    .withFacet("identity_author", new TermsFacetMap("identity_author")
                            .setLimit(100)
                            .setMinCount(1));
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

    public static JSONObject getIdentityLetters(HttpServletRequest request) {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {

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
                    //.withFilter("status:publish")
                    .setLimit(rows)
                    .withFilter("identity_recipient:*")
                    .withFilter("identity_author:*")
                    .returnFields("date_year,identity_name,identity_recipient,identity_author,origin,destination,identities:[json],keywords_category_cs,keywords_cs")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("identity_mentioned", new TermsFacetMap("identity_mentioned") 
                            .setLimit(100)
                            .setSort("index")
                            .setMinCount(1))
                    .withFacet("identity_recipient", new TermsFacetMap("identity_recipient")
                            .setLimit(100)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffrecipients"))
                            .setMinCount(1))
                    .withFacet("identity_author", new TermsFacetMap("identity_author")
                            .setLimit(100)
                            .setSort("index")
                            .setMinCount(1));
            String tenant = request.getParameter("tenant");
            if (tenant != null && !tenant.isBlank()) {
                jrequest = jrequest.withFilter("tenant:" + tenant);
            }
            String date_range = request.getParameter("date_range");
            if (date_range != null && !date_range.isBlank()) {
                jrequest = jrequest.withFilter("{!tag=ffdate_year}date_year:[" + date_range.replaceAll(",", " TO ") + "]");
            }

            if (request.getParameter("recipient") != null) {
                jrequest = jrequest.withFilter("{!tag=ffrecipients}identity_recipient:(+\"" + String.join("\" OR \"", request.getParameterValues("recipient")) + "\")");
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

    public static JSONObject getProfessions(HttpServletRequest request) {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new Http2SolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            String lang = request.getParameter("lang");
            if (lang == null) {
                lang = "cs";
            }
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
                    //.withFilter("status:publish")
                    .setLimit(rows)
                    .withFilter("professions_recipient_"+lang+":*")
                    .withFilter("professions_author_"+lang+":*")
                    .returnFields("date_year,identity_name,identity_recipient,identity_author,origin,destination,identities:[json],professions:[json]")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("tenants", new TermsFacetMap("tenant")
                            .setLimit(100)
                            .withDomain(new DomainMap().withTagsToExclude("fftenant"))
                            .setMinCount(1))
                    .withFacet("professions_author", new TermsFacetMap("professions_author_"+lang+"")
                            .setLimit(100)
                            .setMinCount(1))
                    .withFacet("professions_recipient", new TermsFacetMap("professions_recipient_"+lang+"")
                            .setLimit(100)
                            .setMinCount(1))
                    .withFacet("professions_mentioned", new TermsFacetMap("professions_mentioned_"+lang+"")
                            .setLimit(100)
                            .setMinCount(1));
            String tenant = request.getParameter("tenant");
            if (tenant != null && !tenant.isBlank()) {
                jrequest = jrequest.withFilter("{!tag=fftenant}tenant:" + tenant);
            }
            String date_range = request.getParameter("date_range");
            if (date_range != null && !date_range.isBlank()) {
                jrequest = jrequest.withFilter("{!tag=ffdate_year}date_year:[" + date_range.replaceAll(",", " TO ") + "]");
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

}
