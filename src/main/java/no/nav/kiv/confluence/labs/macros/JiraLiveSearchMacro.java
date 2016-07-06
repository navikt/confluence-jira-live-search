package no.nav.kiv.confluence.labs.macros;

import com.atlassian.confluence.content.render.xhtml.ConversionContext;
import com.atlassian.confluence.content.render.xhtml.DefaultConversionContext;
import com.atlassian.confluence.macro.Macro;
import com.atlassian.confluence.macro.MacroExecutionException;
import com.atlassian.confluence.renderer.radeox.macros.MacroUtils;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.confluence.util.velocity.VelocityUtils;
import com.atlassian.plugin.spring.scanner.annotation.component.Scanned;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.renderer.RenderContext;
import com.atlassian.renderer.v2.RenderMode;
import com.atlassian.renderer.v2.macro.BaseMacro;
import com.atlassian.renderer.v2.macro.MacroException;
import no.nav.kiv.confluence.labs.utils.RequestBuilder;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.UUID;

/**
 * User: Michal J. Sladek
 * Date: 05.09.2015
 */
@Scanned
public class JiraLiveSearchMacro extends BaseMacro implements Macro {

    private static final Logger LOG = LoggerFactory.getLogger(JiraLiveSearchMacro.class);

    public static final String MEDIUM_SIZE = "medium";

    private RequestBuilder requestBuilder;

    public JiraLiveSearchMacro(@ComponentImport RequestBuilder requestBuilder) {
        super();
        this.requestBuilder = requestBuilder;
    }

    @Override
    public String execute(Map<String, String> parameters, String body, ConversionContext conversionContext) throws MacroExecutionException {
        logExecution(conversionContext);

        String project = parameters.get("project");

        String issueType = parameters.get("issueType");
        String placeholder = parameters.get("placeholder");

        String size = parameters.get("size");
        if (StringUtils.isBlank(size)) size = MEDIUM_SIZE;

        final Map<String, Object> contextMap = MacroUtils.defaultVelocityContext();

        contextMap.put("id", UUID.randomUUID().toString());
        contextMap.put("project", project.trim().toUpperCase());
        contextMap.put("issueType", issueType);
        contextMap.put("size", size);
        contextMap.put("placeholder", placeholder);
        final String advanced = parameters.get("advanced");
        contextMap.put("advanced", advanced);

        contextMap.put("applink", requestBuilder.getApplicationLinkHost());

        if(Boolean.parseBoolean(advanced)) {
            return VelocityUtils.getRenderedTemplate("/templates/advanced.vm", contextMap);
        }

        return VelocityUtils.getRenderedTemplate("/templates/livesearch.vm", contextMap);
    }

    @Override
    public BodyType getBodyType() {
        return BodyType.NONE;
    }

    @Override
    public OutputType getOutputType() {
        return OutputType.INLINE;
    }

    protected void sanitizeParameters(Map<String, String> parameters, Map<String, String> defaultParameters) {
        for (String key : defaultParameters.keySet()) {
            if (!parameters.containsKey(key)) {
                parameters.put(key, defaultParameters.get(key));
            }
        }
    }

    private void logExecution(ConversionContext conversionContext) {
        if (conversionContext != null && conversionContext.getEntity() != null && AuthenticatedUserThreadLocal.get() != null) {
            LOG.info("NAV IKT macro execution: " + getClass().getCanonicalName() + " "
                    + conversionContext.getEntity().getIdAsString());
        }
    }

    @Override
    public boolean hasBody() {
        return false;
    }

    @Override
    public RenderMode getBodyRenderMode() {
        return RenderMode.ALL;
    }

    @Override
    public String execute(Map map, String s, RenderContext renderContext) throws MacroException {
        try {
            return execute(map, s, new DefaultConversionContext(renderContext));
        } catch (MacroExecutionException e) {
            throw new MacroException(e.getMessage());
        }
    }
}
