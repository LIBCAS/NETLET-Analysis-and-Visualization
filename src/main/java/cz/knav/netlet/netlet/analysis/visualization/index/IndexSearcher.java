package cz.knav.netlet.netlet.analysis.visualization.index;

import cz.knav.netlet.netlet.analysis.visualization.Options;
import jakarta.servlet.http.HttpServletRequest;
import java.text.SimpleDateFormat;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.client.solrj.impl.HttpJdkSolrClient;
import org.apache.solr.client.solrj.impl.NoOpResponseParser;
import org.apache.solr.client.solrj.request.json.DomainMap;
import org.apache.solr.client.solrj.request.json.JsonQueryRequest;
import org.apache.solr.client.solrj.request.json.RangeFacetMap;
import org.apache.solr.client.solrj.request.json.TermsFacetMap;
import org.apache.solr.common.util.NamedList;
import org.json.JSONObject;

/**
 *
 * @author alberto
 */
public class IndexSearcher {

    public static final Logger LOGGER = Logger.getLogger(IndexSearcher.class.getName());
    final static SimpleDateFormat dtformatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    public static JSONObject getTenants() {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) { 
  
            final TermsFacetMap tenantFacet = new TermsFacetMap("tenant")
                    .setLimit(100)
                    .setMinCount(0)
                    .withStatSubFacet("date_year_min", "min(date_year)")
                    .withStatSubFacet("date_year_max", "max(date_year)")
                    .withStatSubFacet("date_computed_min_s", "min(date_computed)")
                    .withStatSubFacet("date_computed_max_s", "max(date_computed)");

            final JsonQueryRequest request = new JsonQueryRequest()
                    .setQuery("*:*")
                    //.withFilter("status:publish")
                    .withFilter("-date_year:0")
                    .setLimit(0)
                    .withFacet("tenant", tenantFacet);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            request.setResponseParser(rawJsonResponseParser); 
            NamedList<Object> resp = solr.request(request, "hiko");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);
            
//            QueryResponse queryResponse = request.process(solr, "hiko");
//            ret = new JSONObject(queryResponse.jsonStr());

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

    public static JSONObject relation(HttpServletRequest request) {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
//            RangeFacetMap rangeFacet = new RangeFacetMap("date_year", Long.parseLong(years[0]), Long.parseLong(years[1]), 1)
//                    .setOtherBuckets(RangeFacetMap.OtherBuckets.AFTER);
            
            RangeFacetMap rangeFacet = new RangeFacetMap("date_computed_range", dtformatter.parse(years[0]), dtformatter.parse(years[1]), "+1YEAR")
                            .withDomain(new DomainMap().withTagsToExclude("ffdate_range"))
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
                    .setSort("date_computed asc")
                    //.withFilter("status:publish")
                    .withFilter("identity_mentioned:*")
                    .returnFields("tenant,date_year,date_computed,identity_name,identity_recipient,identity_author,identity_mentioned,places:[json],identities:[json],keywords_category_cs,keywords_cs")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("mentioned", new TermsFacetMap("identity_mentioned")
                            .setLimit(1000)
                            .setSort("index")
                            .setMinCount(1)
                                .withSubFacet("tenant", new TermsFacetMap("tenant")
                                .setLimit(100)
                                .setMinCount(1))
                            )
                    .withFacet("recipients", new TermsFacetMap("identity_recipient")
                            .setLimit(-1)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffrecipients"))
                            .setMinCount(1)
                                .withSubFacet("tenant", new TermsFacetMap("tenant")
                                .setLimit(100)
                                .setMinCount(1))
                    )
                            //                    .withFacet("identity_author", new TermsFacetMap("identity_author")
                            //                            .setLimit(1000)
                            //                            .setSort("index")
                            //                            .setMinCount(1))
                            .setLimit(rows);
            
            String lang = request.getParameter("lang"); 
            if (lang == null) {
                lang = "cs";
            }
            jrequest = addFilters(request, jrequest, lang);
            
            

            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "hiko");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

    public static JSONObject getKeywords(HttpServletRequest request) {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            String lang = request.getParameter("lang"); 
            if (lang == null) {
                lang = "cs";
            }

            final TermsFacetMap keywords_autorFacet = new TermsFacetMap("keywords_" + lang)
                    .setLimit(1000)
                    .setMinCount(1);
                    
            if (Boolean.parseBoolean(request.getParameter("includeAuthors"))) {
                final TermsFacetMap identity_authorFacet = new TermsFacetMap("identity_author")
                        .setLimit(1000)
                        .setMinCount(1);
                keywords_autorFacet.withSubFacet("identities", identity_authorFacet);
            }

            final TermsFacetMap keywords_destFacet = new TermsFacetMap("keywords_" + lang)
                    .setLimit(1000)
                    .setMinCount(1);
                    
            if (Boolean.parseBoolean(request.getParameter("includeRecipients"))) {
                final TermsFacetMap identity_authorFacet = new TermsFacetMap("identity_recipient")
                        .setLimit(1000)
                        .setMinCount(1);
                keywords_destFacet.withSubFacet("identities", identity_authorFacet);
            }

            final TermsFacetMap categoriesFacet = new TermsFacetMap("keywords_category_" + lang)
                    .setLimit(1000)
                    .setMinCount(1)
                    //.setSort("index")
                    .withSubFacet("keywords_autor", keywords_autorFacet)
                    .withSubFacet("keywords_recipient", keywords_destFacet);

            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            RangeFacetMap rangeFacet = new RangeFacetMap("date_computed_range", dtformatter.parse(years[0]), dtformatter.parse(years[1]), "+1YEAR")
                            .withDomain(new DomainMap().withTagsToExclude("ffdate_range"))
                    .setOtherBuckets(RangeFacetMap.OtherBuckets.AFTER);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    .withFilter("keywords_category_" + lang + ":*")
                    //.withFilter("status:publish")
                    .setLimit(0)
                    .returnFields("date_year,date_computed,identity_name,identity_recipient,identity_author,origin,destination,places:[json],identities:[json],keywords_category_" + lang + ",keywords_" + lang + "")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("tenants", new TermsFacetMap("tenant")
                            .setLimit(1000)
                            .withDomain(new DomainMap()
                                    .withQuery("keywords_category_" + lang + ":*")
                            //.withTagsToExclude("fftenant")
                            )
                            .setMinCount(1))
                    .withFacet("keywords", categoriesFacet)
                    // .withFacet("identity_mentioned", identity_mentionedFacet)
                    .withFacet("recipients", new TermsFacetMap("identity_recipient")
                            .setLimit(1000)
                            .setMinCount(1))
                    .withFacet("authors", new TermsFacetMap("identity_author")
                            .setLimit(1000)
                            .setMinCount(1));
            
            jrequest = addFilters(request, jrequest, lang);

            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "hiko");
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
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            String lang = request.getParameter("lang");
            if (lang == null) {
                lang = "cs";
            }
            final TermsFacetMap keywords_csFacet = new TermsFacetMap("keywords_cs")
                    .setLimit(1000)     
                    .setMinCount(1);

            final TermsFacetMap categories_csFacet = new TermsFacetMap("keywords_category_cs")
                    .setLimit(1000)
                    .setMinCount(1)
                    .withSubFacet("keywords", keywords_csFacet);

            final TermsFacetMap identity_mentionedFacet = new TermsFacetMap("identity_mentioned")
                    .setLimit(1000)
                    .setMinCount(1);

            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            RangeFacetMap rangeFacet = new RangeFacetMap("date_computed_range", dtformatter.parse(years[0]), dtformatter.parse(years[1]), "+1YEAR")
                            .withDomain(new DomainMap().withTagsToExclude("ffdate_range"))
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
                    .returnFields("letter_id,tenant,date_year,identity_name,identity_recipient,identity_author,origin,destination,origin_name,destination_name,places:[json],identities:[json],keywords_category_cs,keywords_cs")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("keywords_cs", keywords_csFacet)
                    .withFacet("keywords_categories", categories_csFacet)
                    .withFacet("identity_mentioned", identity_mentionedFacet)
                    .withFacet("tenants", new TermsFacetMap("tenant")
                            .setLimit(1000)
                            .withDomain(new DomainMap()
                                    .withQuery("origin:* AND destination:*")
                            //.withTagsToExclude("fftenant")
                            )
                            .setMinCount(1))
                    .withFacet("identity_recipient", new TermsFacetMap("identity_recipient")
                            .setLimit(1000)
                            .setMinCount(1))
                    .withFacet("identity_author", new TermsFacetMap("identity_author")
                            .setLimit(1000)
                            .setMinCount(1));
            
            jrequest = addFilters(request, jrequest, lang);

            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "hiko");
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
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            String lang = request.getParameter("lang");
            if (lang == null) {
                lang = "cs";
            }

            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            RangeFacetMap rangeFacet = new RangeFacetMap("date_computed_range", dtformatter.parse(years[0]), dtformatter.parse(years[1]), "+1YEAR")
                            .withDomain(new DomainMap().withTagsToExclude("ffdate_range"))
                    .setOtherBuckets(RangeFacetMap.OtherBuckets.AFTER);

            String rowsP = request.getParameter("rows");
            int rows = 0;
            if (rowsP != null && !rowsP.isBlank()) {
                rows = Integer.valueOf(rowsP);
            }
            
            final TermsFacetMap keywords_csFacet = new TermsFacetMap("keywords_" + lang)
                    .setLimit(1000)
                    .setMinCount(1);
            final TermsFacetMap categoriesFacet = new TermsFacetMap("keywords_category_" + lang)
                    .setLimit(1000)
                    .setMinCount(1)
                    //.setSort("index")
                    .withSubFacet("keywords", keywords_csFacet);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    //.withFilter("status:publish")
                    .setLimit(rows)
                    .withFilter("identity_recipient:*")
                    .withFilter("identity_author:*")
                    .returnFields("letter_id,tenant,date_year,identity_name,identity_recipient,identity_author,identity_mentioned,origin,destination,identities:[json],keywords_category_cs,keywords_cs")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("keywords", categoriesFacet)
                    .withFacet("mentioned", new TermsFacetMap("identity_mentioned")
                            .setLimit(1000)
                            .setSort("index")
                            .setMinCount(1))
                    .withFacet("recipients", new TermsFacetMap("identity_recipient")
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffrecipients"))
                            .setMinCount(1))
                    .withFacet("authors", new TermsFacetMap("identity_author")
                            .setLimit(1000)
                            .setSort("index")
                            .setMinCount(1));
            
            jrequest = addFilters(request, jrequest, lang);

            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "hiko");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);
            jrequest = null;  
            resp = null; 
            solr.close();
        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }

    public static JSONObject getProfessions(HttpServletRequest request) {
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {
            String lang = request.getParameter("lang");
            if (lang == null) {
                lang = "cs";
            }
            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            RangeFacetMap rangeFacet = new RangeFacetMap("date_computed_range", dtformatter.parse(years[0]), dtformatter.parse(years[1]), "+1YEAR")
                            .withDomain(new DomainMap().withTagsToExclude("ffdate_range"))
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
                    .withFilter("professions_recipient_" + lang + ":*")
                    .withFilter("professions_author_" + lang + ":*")
                    .returnFields("date_year,identity_name,identity_recipient,identity_author,origin,destination,identities:[json],professions:[json]")
                    .withFacet("date_year", rangeFacet)
                    .withFacet("tenants", new TermsFacetMap("tenant")
                            .setLimit(1000)
                            .withDomain(new DomainMap().withTagsToExclude("fftenant").withTagsToExclude("ffdate_year"))
                            .setMinCount(1))
                    .withFacet("professions", new TermsFacetMap("professions_" + lang)
                            .setLimit(1000)
                            .setMinCount(1))
                    .withFacet("professions_author", new TermsFacetMap("professions_author_" + lang)
                            .setLimit(1000)
                            .setMinCount(1))
                    .withFacet("professions_recipient", new TermsFacetMap("professions_recipient_" + lang)
                            .setLimit(1000)
                            .setMinCount(1))
                    .withFacet("professions_mentioned", new TermsFacetMap("professions_mentioned_" + lang)
                            .setLimit(1000)
                            .setMinCount(1));
            jrequest = addFilters(request, jrequest, lang);

            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "hiko");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }
    
    public static JSONObject getTimeLine(HttpServletRequest request) {  
        JSONObject ret = new JSONObject();
        try (SolrClient solr = new HttpJdkSolrClient.Builder(Options.getInstance().getString("solr")).build()) {

            String lang = request.getParameter("lang");
            if (lang == null) {
                lang = "cs";
            }

            String tenant_date_range = request.getParameter("tenant_date_range");
            if (tenant_date_range == null || tenant_date_range.isBlank()) {
                tenant_date_range = "1000,2025";
            }
            String[] years = tenant_date_range.split(",");
            RangeFacetMap rangeFacet = new RangeFacetMap("date_computed_range", dtformatter.parse(years[0]), dtformatter.parse(years[1]), "+1MONTH")
                            .withDomain(new DomainMap().withTagsToExclude("ffdate_range"))
                    .setOtherBuckets(RangeFacetMap.OtherBuckets.AFTER);

            String rowsP = request.getParameter("rows");
            int rows = 0;
            if (rowsP != null && !rowsP.isBlank()) {
                rows = Integer.valueOf(rowsP);
            }
            String offsetP = request.getParameter("offset");
            int offset = 0;
            if (offsetP != null && !offsetP.isBlank()) {
                offset = Integer.valueOf(offsetP);
            }
            
//            final TermsFacetMap keywords_csFacet = new TermsFacetMap("keywords_" + lang)
//                    .setLimit(1000)
//                    .setMinCount(1);
            final TermsFacetMap categoriesFacet = new TermsFacetMap("keywords_category_" + lang)
                    .setLimit(1000)
                    .withDomain(new DomainMap().withTagsToExclude("ffkeywords"))
//                    .withSubFacet("keywords", keywords_csFacet)
                    .setMinCount(1);

            NoOpResponseParser rawJsonResponseParser = new NoOpResponseParser();
            rawJsonResponseParser.setWriterType("json");
            JsonQueryRequest jrequest = new JsonQueryRequest()
                    .setQuery("*:*")
                    //.withFilter("status:publish")
                    .withFilter("-date_year:0")
                    .setLimit(rows)
                    .setOffset(offset)
                    .withFilter("identity_recipient:*")
                    .withFilter("identity_author:*")
                    .setSort("date_computed asc")
                    .returnFields("letter_id,tenant,date_computed,date_year,identity_name,identity_recipient,identity_author,origin,destination,places:[json],identities:[json],keywords_category_cs,keywords_cs")
                    .withFacet("date_computed_range", rangeFacet)
                    // .withFacet("keywords_categories", categoriesFacet)
                    .withFacet("origins", new TermsFacetMap("origin_name")
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("fforigin"))
                            .setMinCount(1)) 
                    .withFacet("destinations", new TermsFacetMap("destination_name")
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffdestination"))
                            .setMinCount(1)) 
                    .withFacet("professions", new TermsFacetMap("professions_" + lang)
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffprofession"))
                            .setMinCount(1)) 
                    .withFacet("keywords", new TermsFacetMap("keywords_category_" + lang)
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffkeywords"))
                            .setMinCount(1))
                    .withFacet("mentioned", new TermsFacetMap("identity_mentioned")
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffmentioned"))
                            .setMinCount(1))
                    .withFacet("recipients", new TermsFacetMap("identity_recipient")
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffrecipients"))
                            .setMinCount(1))
                    .withFacet("authors", new TermsFacetMap("identity_author")
                            .setLimit(1000)
                            .setSort("index")
                            .withDomain(new DomainMap().withTagsToExclude("ffauthors"))
                            .setMinCount(1));
            
            jrequest = addFilters(request, jrequest, lang);
//            QueryResponse queryResponse = jrequest.process(solr, "hiko");
//            ret = new JSONObject(queryResponse.jsonStr());

            jrequest.setResponseParser(rawJsonResponseParser);
            NamedList<Object> resp = solr.request(jrequest, "hiko");
            String jsonResponse = (String) resp.get("response");
            ret = new JSONObject(jsonResponse);
            jrequest = null;  
            resp = null; 
            solr.close();
        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, null, ex);
            ret.put("error", ex);
        }
        return ret;
    }
    
    public static JsonQueryRequest addFilters(HttpServletRequest request, JsonQueryRequest jrequest, String lang) {
        String other_tenant = request.getParameter("other_tenant");
        if (other_tenant != null) {
            String tenant = request.getParameter("tenant");
            if (tenant != null && !tenant.isBlank()) {
                if (!other_tenant.isBlank()) {
                    tenant += " OR tenant:" + other_tenant;
                }
                jrequest = jrequest.withFilter("tenant:" + tenant);
            }
        } else {
            String[] tenants = request.getParameterValues("tenant");
            if (tenants.length > 0) {
                jrequest = jrequest.withFilter("{!tag=fftenant}tenant:(" + String.join(" ", tenants) + ")");
            }
        }    
            
            String date_range = request.getParameter("date_range");
            if (date_range != null && !date_range.isBlank()) {
                jrequest = jrequest.withFilter("{!tag=ffdate_range}date_computed_range:[" + date_range.replaceAll(",", " TO ") + "]");
            }

            if (request.getParameter("author") != null) {
                jrequest = jrequest.withFilter("{!tag=ffauthors}identity_author:(\"" + String.join("\" OR \"", request.getParameterValues("author")) + "\")");
            }

            if (request.getParameter("recipient") != null) {
                jrequest = jrequest.withFilter("{!tag=ffrecipients}identity_recipient:(\"" + String.join("\" OR \"", request.getParameterValues("recipient")) + "\")");
            }

            if (request.getParameter("mentioned") != null) {
                jrequest = jrequest.withFilter("{!tag=ffmentioned}identity_mentioned:(\"" + String.join("\" OR \"", request.getParameterValues("mentioned")) + "\")");
            }
            
            if (request.getParameter("keyword") != null) {
                jrequest = jrequest.withFilter("{!tag=ffkeywords}keywords_category_" + lang + ":(\"" + String.join("\" OR \"", request.getParameterValues("keyword")) + "\")");
            }
            
            if (request.getParameter("profession") != null) {
                jrequest = jrequest.withFilter("{!tag=ffprofession}professions_" + lang + ":(\"" + String.join("\" OR \"", request.getParameterValues("profession")) + "\")");
            }
            
            if (request.getParameter("origin") != null) {
                jrequest = jrequest.withFilter("{!tag=fforigin}origin_name" + ":(\"" + String.join("\" OR \"", request.getParameterValues("origin")) + "\")");
            }
            
            if (request.getParameter("destination") != null) {
                jrequest = jrequest.withFilter("{!tag=ffdestination}destination_name" + ":(\"" + String.join("\" OR \"", request.getParameterValues("destination")) + "\")");
            }
            return jrequest;
    }

}
