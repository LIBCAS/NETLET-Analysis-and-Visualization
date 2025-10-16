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
                JSONObject json = actionToDo.doPerform(request, response);
                if (json != null) {
                    response.getWriter().println(json.toString(2));
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
        GET_TENANTS {
            @Override
            JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                
                JSONObject ret = IndexSearcher.getTenants().getJSONObject("facets").getJSONObject("tenant");
                return ret;
            }
        },
        INDEX_HIKO {
            @Override
            JSONObject doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.full();
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, null, ex);
                    json.put("error", ex.toString());
                }
                return json;
            }
        },
        UPDATE_HIKO {
            @Override
            JSONObject doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer(); 
                    json = hi.update(Integer.parseInt(req.getParameter("value")), req.getParameter("unit"));
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, null, ex);
                    json.put("error", ex.toString());
                }
                return json;
            }
        },
        INDEX_HIKO_TENANT {
            @Override
            JSONObject doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoIndexer hi = new HikoIndexer();
                    json = hi.indexTenant(req.getParameter("tenant"));
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, null, ex);
                    json.put("error", ex.toString());
                }
                return json;
            }
        },
        INDEX_HIKO_DB {
            @Override
            JSONObject doPerform(HttpServletRequest req, HttpServletResponse response) throws Exception {

                JSONObject json = new JSONObject();
                try {
                    HikoDbIndexer hi = new HikoDbIndexer();
                    json.put("keywords", hi.full());
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, null, ex);
                    json.put("error", ex.toString());
                }
                return json;
            }
        },
        MAP{
            @Override
            JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();
                if (request.getParameter("tenant") != null) { 
                    ret = IndexSearcher.getMapLetters(request);
                }
                return ret;
            }
        },
        IDENTITIES{
            @Override
            JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();
                if (request.getParameter("tenant") != null) { 
                    ret = IndexSearcher.getIdentityLetters(request);  
                }
                return ret;
            }
        },
        RELATION{
            @Override
            JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();
                if (request.getParameter("tenant") != null) { 
                    ret = IndexSearcher.relation(request);
                }
                return ret;
            }
        },
        KEYWORDS {
            @Override
            JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();
                if (request.getParameter("tenant") != null) {
                    ret = IndexSearcher.getKeywords(request);
                }
                return ret;
            }
        },
        PROFESSIONS {
            @Override
            JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();
                if (request.getParameter("tenant") != null) {
                    ret = IndexSearcher.getProfessions(request);
                }
                return ret;
            }
        },
        TIMELINE {
            @Override
            JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception {
                JSONObject ret = new JSONObject();
                if (request.getParameter("tenant") != null) {
                    ret = IndexSearcher.getTimeLine(request);
                }
                return ret;
            }
        }; 

        abstract JSONObject doPerform(HttpServletRequest request, HttpServletResponse response) throws Exception;
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
