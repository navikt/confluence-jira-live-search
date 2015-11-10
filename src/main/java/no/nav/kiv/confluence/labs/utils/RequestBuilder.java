package no.nav.kiv.confluence.labs.utils;

import com.atlassian.applinks.api.*;
import com.atlassian.applinks.api.application.jira.JiraApplicationType;
import com.atlassian.sal.api.net.Request.MethodType;

/**
 * Encapsulates navigating from an {@link EntityLinkService} to an {@link ApplicationLinkRequestFactory} creating requests on a
 * Confluence instance, and also creating {@link ApplicationLinkRequest} objects that will perform actions on Confluence.
 *
 * The navigation takes place in a lazy fashion; the link and factory aren't found until they are needed.
 *
 * @author Steinar Bang
 *
 */
public class RequestBuilder {

    private ApplicationLinkService applicationLinkService;
    private ApplicationLink confluenceAppLink;
    private ApplicationLinkRequestFactory confluenceRequestFactory;

    public RequestBuilder(ApplicationLinkService applicationLinkService) {
        this.applicationLinkService = applicationLinkService;
    }

    public ApplicationLink lazyFindConfluenceApplicationLink() {
        if (null == confluenceAppLink) {
            final Iterable<ApplicationLink> applicationLinks = applicationLinkService.getApplicationLinks(JiraApplicationType.class);

            confluenceAppLink = applicationLinks.iterator().next();
        }

        if (null == confluenceAppLink) {
            String msg = "No primary jira application link found.";
            throw new RuntimeException(msg);
        }

        return confluenceAppLink;
    }

    public ApplicationLinkRequest createRequest(MethodType method, String url) throws CredentialsRequiredException {
        ApplicationLinkRequestFactory factory = lazyFindConfluenceRequestFactory();
        return factory.createRequest(method, url);
    }

    private ApplicationLinkRequestFactory lazyFindConfluenceRequestFactory() {
        if (null == confluenceAppLink) {
            lazyFindConfluenceApplicationLink();
        }

        if (null == confluenceRequestFactory) {
            confluenceRequestFactory = confluenceAppLink.createAuthenticatedRequestFactory();
        }

        return confluenceRequestFactory;
    }

}