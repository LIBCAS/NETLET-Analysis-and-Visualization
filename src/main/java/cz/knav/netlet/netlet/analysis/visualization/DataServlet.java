package cz.knav.netlet.netlet.analysis.visualization;

import cz.knav.netlet.netlet.analysis.visualization.index.HikoDbIndexer;
import cz.knav.netlet.netlet.analysis.visualization.index.HikoIndexer;
import cz.knav.netlet.netlet.analysis.visualization.index.IndexSearcher;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger; 
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.json.JSONObject;

/**
 *
 * @author alberto
 */
@WebServlet(name = "DataServlet", urlPatterns = {"/data/*"})
public class DataServlet extends HttpServlet {

    public static final Logger LOGGER = Logger.getLogger(DataServlet.class.getName());

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1
        response.setHeader("Pragma", "no-cache"); // HTTP 1.0
        response.setDateHeader("Expires", 0); // Proxies.
        try {
            String actionNameParam = request.getPathInfo().substring(1);
            if (actionNameParam != null) {
                Actions actionToDo = Actions.valueOf(actionNameParam.toUpperCase());
                String json = actionToDo.doPerform(request, response);
                if (json != null) {
                    response.getWriter().println(json); 
                }

            } else {
                response.getWriter().print("actionNameParam -> " + actionNameParam);
            }
        } catch (IOException e1) {
            LOGGER.log(Level.SEVERE, e1.getMessage(), e1);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e1.toString());
            response.getWriter().print(e1.toString());
        } catch (SecurityException e1) {
            LOGGER.log(Level.SEVERE, e1.getMessage(), e1);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        } catch (Exception e1) {
            LOGGER.log(Level.SEVERE, e1.getMessage(), e1);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e1.toString());
            response.getWriter().print(e1.toString());
        }
    }

    enum Actions {
        GET_DICTS {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
              if (InitServlet.DICTS == null) {
                JSONObject ret = new JSONObject();
                ret.put("tenants", IndexSearcher.getTenants().getJSONObject("facets").getJSONObject("tenant"));
                ret.put("places", IndexSearcher.getAllPlaces());
                ret.put("identities", IndexSearcher.getAllIdentities());
                ret.put("professions", IndexSearcher.getAllProfessions());
                ret.put("lettersCount", IndexSearcher.getTotalLetters().getJSONObject("response").getInt("numFound"));
                InitServlet.DICTS = ret;
              }
                return InitServlet.DICTS.toString();
            }
        },
        GET_TOTAL {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getTotalLetters().toString();
            }
        },
        GET_TENANTS {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getTenants().getJSONObject("facets").getJSONObject("tenant").toString();
            }
        },
        INDEX_HIKO {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.full();
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error {0}", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        INDEX_IDENTITIES {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.indexIdentities(req.getParameter("tenant"));
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error {0}", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        INDEX_PROFESSIONS {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.indexGlobalProfessions();
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error {0}", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        INDEX_PLACES {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.indexPlaces();
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error {0}", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        UPDATE_HIKO {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer(); 
                    json = hi.update(Integer.parseInt(req.getParameter("value")), req.getParameter("unit"));
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        INDEX_HIKO_TENANTS {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.indexTenants();
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        INDEX_HIKO_TENANT {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.indexTenant(req.getParameter("tenant"));
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        INDEX_HIKO_LETTER {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {
                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.indexLetter(req.getParameter("tenant"), req.getParameter("id"));
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        INDEX_HIKO_DB {
            @Override
            String doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoDbIndexer hi = new HikoDbIndexer();
                    json.put("keywords", hi.full());
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, "Error", ex);
                    json.put("error", ex.toString());
                }
                return json.toString();
            }
        },
        MAP{
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getMapLetters(request).toString();
            }
        },
        MAP_IN_TIME{
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.mapInTime(request).toString(); 
            }
        },
        IDENTITIES{
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.identityFacets(request);  
            }
        },
        RELATION{
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.relation(request).toString();
            }
        },
        IDENTITY_LETTERS{
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.identityLetters(request);
            }
        },
        KEYWORDS {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.keywords(request).toString();
            }
        },
        GET_LETTER {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getLetter(request.getParameter("id")).toString();
            }
        },
        GET_CATALOG {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getCatalog(request.getParameter("id")).toString();
            }
        },
        GET_PLACE {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getPlace(request.getParameter("id")).toString();
            }
        },
        GET_IDENTITY {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getIdentity(request.getParameter("id")).toString();
            }
        },
        IDENTITY_IN_TIME {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.twoIdentitiesInTime(request.getParameter("id"), request.getParameter("id2")).toString(); 
            }
        },
        CATALOGS_IN_TIME {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.catalogsInTime().toString(); 
            }
        },
        IDENTITY_IN_CATALOG {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.getIdentityInCatalog(request.getParameter("id"), request.getParameter("catalog")).toString();
            }
        },
        SEARCH_KEYWORDS {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();

                String lang = request.getParameter("lang");
                if (lang == null) {
                    lang = "cs";
                }
                ret.put("keywords", IndexSearcher.searchKeywords(request.getParameter("prefix"), 
                        request.getParameter("tenant"),
                        lang, "name_lower_"+lang, "type:[value v=keyword],value:name_" + lang,
                        false).getJSONObject("response").getJSONArray("docs"));
                ret.put("categories", IndexSearcher.searchKeywords(request.getParameter("prefix"), 
                        request.getParameter("tenant"),
                        lang, "category_lower_"+lang,  "type:[value v=category],value:category_"+lang, 
                        true).getJSONObject("response").getJSONArray("docs"));
                return ret.toString();
            }
        },
        SEARCH_LANGUAGES {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();

                String lang = request.getParameter("lang");
                if (lang == null) {
                    lang = "cs";
                }
                ret.put("languages", IndexSearcher.searchLanguages()
                        .getJSONObject("facets").getJSONObject("languages").getJSONArray("buckets"));
                return ret.toString();
            }
        },
        SEARCH_PLACES {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();

                String lang = request.getParameter("lang");
                if (lang == null) {
                    lang = "cs";
                }
                ret.put("places", IndexSearcher.searchPlaces(request.getParameter("prefix"), 
                        request.getParameter("tenant"),
                        lang).getJSONObject("response").getJSONArray("docs"));
                return ret.toString();
            }
        },
        SEARCH_IDENTITIES {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();

                String lang = request.getParameter("lang");
                if (lang == null) {
                    lang = "cs";
                }
                ret.put("identities", IndexSearcher.searchIdentities(request.getParameter("prefix"), 
                        request.getParameter("tenant"),
                        lang).getJSONObject("response").getJSONArray("docs"));
                return ret.toString();
            }
        },
        PERIODS {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.periods(request).toString();
            }
        },
        PROFESSIONS {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.professions(request);
            }
        },
        TIMELINE {
            @Override
            String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                return IndexSearcher.timeline(request).toString();
            }
        }; 

        abstract String doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception;
    }

// <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}
