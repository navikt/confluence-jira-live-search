package no.nav.kiv.confluence.labs.rest;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * User: Michal J. Sladek
 * Date: 07.09.2015
 */
@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement
public class LiveSearchModel {
    String searchString;
    String projectKey;
    String issueTypes;
    String fields;

    public LiveSearchModel() {
    }

    public LiveSearchModel(String searchString, String projectKey, String issueTypes, String fields) {
        this.searchString = searchString;
        this.projectKey = projectKey;
        this.issueTypes = issueTypes;
        this.fields = fields;
    }

    public String getSearchString() {
        return searchString;
    }

    public void setSearchString(String searchString) {
        this.searchString = searchString;
    }

    public String getProjectKey() {
        return projectKey;
    }

    public void setProjectKey(String projectKey) {
        this.projectKey = projectKey;
    }

    public String getIssueTypes() {
        return issueTypes;
    }

    public void setIssueTypes(String issueTypes) {
        this.issueTypes = issueTypes;
    }

    public String getFields() {
        return fields;
    }

    public void setFields(String fields) {
        this.fields = fields;
    }
}
