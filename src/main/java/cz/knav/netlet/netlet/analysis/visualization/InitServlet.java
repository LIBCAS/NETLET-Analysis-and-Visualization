package cz.knav.netlet.netlet.analysis.visualization;

import cz.knav.netlet.netlet.analysis.visualization.index.HikoIndexer;
import java.io.File;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 *
 * @author alberto
 */
public class InitServlet extends HttpServlet {
  public static final Logger LOGGER = Logger.getLogger(InitServlet.class.getName());

  //Directory where cant override configuration  
  public static String CONFIG_DIR = ".netlet";

  //Default config directory in webapp
  public static String DEFAULT_CONFIG_DIR = "/assets";

  //Default configuration file 
  public static String DEFAULT_CONFIG_FILE = "config.json";

  //Default config directory in webapp
  public static String DEFAULT_I18N_DIR = "/assets/i18n";
  
  
  public static ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(2);
  public static ScheduledFuture<?> future;
  public static boolean taskRunning;


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
    
  }

  @Override
  public void init() throws ServletException {
    System.setProperty("jdk.httpclient.keepalive.timeout", "2");
    if (getServletContext().getInitParameter("def_config_dir") != null) {
      DEFAULT_CONFIG_DIR = getServletContext().getInitParameter("def_config_dir");
    }
    
    DEFAULT_CONFIG_FILE = getServletContext().getRealPath(DEFAULT_CONFIG_DIR) + File.separator + DEFAULT_CONFIG_FILE;
    DEFAULT_I18N_DIR = getServletContext().getRealPath(DEFAULT_I18N_DIR);
    
    if (System.getProperty("netlet_app_dir") != null) {
      CONFIG_DIR = System.getProperty("netlet_app_dir");
    } else if (getServletContext().getInitParameter("app_dir") != null) {
      CONFIG_DIR = getServletContext().getInitParameter("app_dir");
    } else {
      CONFIG_DIR = System.getProperty("user.home") + File.separator + CONFIG_DIR;
    }
    
    LOGGER.log(Level.INFO, "CONFIG_DIR is -> {0}", CONFIG_DIR);
    
    long period = 1000L * 60L * 60L * 24L; // jednou denne
    future = executor.scheduleAtFixedRate(new Runnable() {

        @Override
        public void run() {

            try {
                LOGGER.log(Level.INFO, "Running future");
                InitServlet.taskRunning = true;
                HikoIndexer hi = new HikoIndexer();
                hi.update(1, "DAYS");
                LOGGER.log(Level.INFO, "Future finished");
            } catch (Exception ioe) {
                LOGGER.log(Level.SEVERE, "", ioe);
            }
        }

    }, 1000L, period, TimeUnit.MILLISECONDS); 
  }
  
  @Override
  public void destroy() {
      
//      try {
//          Indexer.closeClient();
//      } catch (IOException ex) {
//          LOGGER.log(Level.SEVERE, "Error {0}", ex);
//      }
      
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
