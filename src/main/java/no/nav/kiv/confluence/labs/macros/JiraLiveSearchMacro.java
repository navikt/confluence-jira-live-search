package no.nav.kiv.confluence.labs.macros;

import com.atlassian.confluence.content.render.xhtml.ConversionContext;
import com.atlassian.confluence.content.render.xhtml.DefaultConversionContext;
import com.atlassian.confluence.macro.Macro;
import com.atlassian.confluence.macro.MacroExecutionException;
import com.atlassian.confluence.renderer.radeox.macros.MacroUtils;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.confluence.util.velocity.VelocityUtils;
import com.atlassian.renderer.RenderContext;
import com.atlassian.renderer.v2.RenderMode;
import com.atlassian.renderer.v2.macro.BaseMacro;
import com.atlassian.renderer.v2.macro.MacroException;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * User: Michal J. Sladek
 * Date: 05.09.2015
 */
public class JiraLiveSearchMacro extends BaseMacro implements Macro {

    private static final Logger LOG = LoggerFactory.getLogger(JiraLiveSearchMacro.class);

    public static final String SPACE_NAME = "space name";
    public static final String MEDIUM_SIZE = "medium";
    public static final String CONF_ALL = "conf_all";
    public static final String SELF = "@self";

    @Override
    public String execute(Map<String, String> parameters, String body, ConversionContext conversionContext) throws MacroExecutionException {
        logExecution(conversionContext);

        String project = parameters.get("project");

        String size = parameters.get("size");
        if (StringUtils.isBlank(size)) size = MEDIUM_SIZE;

        String issueType = parameters.get("issueType");
        String placeholder = parameters.get("placeholder");

        final Map<String, Object> contextMap = MacroUtils.defaultVelocityContext();


        contextMap.put("project", project);
        contextMap.put("issueType", issueType);
        contextMap.put("size", size);
        contextMap.put("placeholder", placeholder);

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
            LOG.info("TDP macro execution: " + getClass().getCanonicalName() + " "
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
