package no.nav.kiv.confluence.labs.rest;

import com.atlassian.applinks.api.ApplicationLinkRequest;
import com.atlassian.applinks.api.CredentialsRequiredException;
import com.atlassian.confluence.util.HtmlUtil;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.atlassian.sal.api.net.Request;
import com.atlassian.sal.api.net.ResponseException;
import com.google.common.base.Joiner;
import com.google.common.collect.Lists;
import no.nav.kiv.confluence.labs.api.RequestBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.List;

/**
 * A resource of message.
 */
@Path("search")
@Produces({MediaType.APPLICATION_JSON})
@Consumes({MediaType.APPLICATION_JSON})
@Controller
public class MyRestResource {

    private static final Logger log = LoggerFactory.getLogger(MyRestResource.class);

    private RequestBuilder requestBuilder;

    @Autowired
    public MyRestResource(
            @ComponentImport RequestBuilder requestBuilder) {
        this.requestBuilder = requestBuilder;
    }

    @POST
    @AnonymousAllowed
    public Response getMessage(final LiveSearchModel searchModel, @Context HttpHeaders headers) {
        String msg = "";
        String requestPath = "/rest/api/2/search?jql=";
        try {

            if (null != searchModel.getProjectKey()) {
                requestPath = requestPath.concat(HtmlUtil.urlEncode("project in (" + searchModel.getProjectKey() + ") "));
            }

            if (null != searchModel.getIssueTypes()) {
                requestPath = requestPath.concat(HtmlUtil.urlEncode("AND type in (" + searchModel.getIssueTypes() + ") "));
            }

            if (null != searchModel.getFields()) {
                List<String> searchTerms = Lists.newArrayList();
                final String[] splitedTerms = searchModel.getFields().split("\\s*,\\s*");

                requestPath = requestPath.concat(HtmlUtil.urlEncode("AND ("));
                for (String field : splitedTerms) {
                    searchTerms.add(HtmlUtil.urlEncode("'" + field + "' ~ '") + searchModel.getSearchString() + HtmlUtil.urlEncode("'"));
                }
                requestPath = requestPath.concat(Joiner.on("+OR+").join(searchTerms));
                requestPath = requestPath.concat(HtmlUtil.urlEncode(")"));

            } else {
                requestPath = requestPath.concat(HtmlUtil.urlEncode("AND 'summary' ~ '") + searchModel.getSearchString() + HtmlUtil.urlEncode("'"));
            }

            requestPath = requestPath.concat("&maxResults=200");

            ApplicationLinkRequest request = requestBuilder.createRequest(Request.MethodType.GET, requestPath);
            String response = request.execute();
            msg = "Successfully found issues in " + searchModel.getProjectKey();

            return Response.ok(createJSONResponse(msg, response)).build();

        } catch (CredentialsRequiredException e) {
            msg = "[CE] Failed to find issues with the request to " + requestPath + " got " + e.getClass().getName() + " with message: " + e.getMessage();
            if (log.isErrorEnabled()) {
                log.error(msg, e);
            }
        } catch (ResponseException e) {
            msg = "[RE] Failed to find issues with the request to " + requestPath + " got " + e.getClass().getName() + " with message: " + e.getMessage();
            if (log.isErrorEnabled()) {
                log.error(msg, e);
            }
        } catch (Exception e) {
            msg = "Failed to find issues, caught " + e.getClass().getName() + " with message: " + e.getMessage();
            if (log.isErrorEnabled()) {
                log.error(msg, e);
            }
        }

        // Common return point for all caught exceptions, success is returned inside the try
        return Response.serverError().entity(new MyRestResourceModel(msg)).build();
    }

    /**
     * Don't fail this REST endpoint if the response from the Confluence REST endpoint can't be parsed. Just log the JSON parse
     * failure as a warning, and return a successful completion for confluence page creation.
     *
     * @param message  the message to return in case of a JSON error
     * @param response A JSON response from the Confluence REST endpoint
     * @return an object that can be serialized as JSON
     */
    MyRestResourceModel createJSONResponse(String message, String response) {
        try {
            /*JSONObject responseObject = new JSONObject(response);
            String msg = responseObject.getString("value");
            boolean issueFieldUpdated = false;
            if (responseObject.has("issuefieldupdated")) {
                issueFieldUpdated = responseObject.getBoolean("issuefieldupdated");
            }
            String location = null; // location is optional, null values won't be serialized
            if (responseObject.has("location")) {
                location = responseObject.getString("location");
            }*/

            return new MyRestResourceModel(response);
       /* } catch (JSONException e) {
            // The response wasn't parseable as JSON, warn in the log and return a successful
            // response anyway.
            if (log.isWarnEnabled()) {
                log.warn("Caught JSONException parsing the response from the Confluence PK Page creation REST endpoint, response was: " + response, e);
            }*/
        } catch (NullPointerException e) {
            // The response wasn't parseable as JSON, warn in the log and return a successful
            // response anyway.
            if (log.isWarnEnabled()) {
                log.warn("Caught NullPointerException parsing the response from the Confluence PK Page creation REST endpoint", e);
            }
        }

        return new MyRestResourceModel(message);
    }
}