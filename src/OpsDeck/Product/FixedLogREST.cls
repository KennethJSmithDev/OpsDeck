Class OpsDeck.Product.FixedLogREST Extends %CSP.REST
{
XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/intent-profiles" Method="GET" Call="IntentProfiles" />
  <Route Url="/intent-rehearsal" Method="POST" Call="IntentRehearsal" />
  <Route Url="/derived-search" Method="GET" Call="DerivedSearch" />
  <Route Url="/derived-refresh" Method="POST" Call="DerivedRefresh" />
  <Route Url="/messages" Method="GET" Call="MessagesLog" />
  <Route Url="/system-monitor" Method="GET" Call="SystemMonitorLog" />
  <Route Url="/message-rotations" Method="GET" Call="MessageRotations" />
  <Route Url="/message-rotation" Method="GET" Call="MessageRotation" />
  <Route Url="/packages" Method="GET" Call="InstalledPackages" />
  <Route Url="/available-packages" Method="GET" Call="AvailablePackages" />
  <Route Url="/package-authority" Method="GET" Call="PackageAuthority" />
  <Route Url="/package-operation" Method="POST" Call="PackageOperation" />
</Routes>
}

ClassMethod IntentProfiles() As %Status
{
    quit ##class(OpsDeck.Product.IntentRehearsal).Profiles()
}

ClassMethod IntentRehearsal() As %Status
{
    quit ##class(OpsDeck.Product.IntentRehearsal).Rehearse()
}

ClassMethod DerivedSearch() As %Status
{
    quit ##class(OpsDeck.Product.DerivedSearch).Query()
}

ClassMethod DerivedRefresh() As %Status
{
    quit ##class(OpsDeck.Product.DerivedSearch).Refresh()
}

ClassMethod PackageAuthority() As %Status
{
    quit ##class(OpsDeck.Product.PackageOperations).Authority()
}

ClassMethod PackageOperation() As %Status
{
    quit ##class(OpsDeck.Product.PackageOperations).Dispatch()
}

ClassMethod MessagesLog() As %Status
{
    do ..WriteSource("messagesLog")
    quit $$$OK
}

ClassMethod SystemMonitorLog() As %Status
{
    do ..WriteSource("systemMonitorLog")
    quit $$$OK
}

ClassMethod MessageRotations() As %Status
{
    set %response.ContentType="application/json; charset=utf-8"
    set sc=##class(OpsDeck.Product.FixedLogReader).ListMessageRotations(.result)
    if $$$ISERR(sc) {
        set result=##class(%DynamicObject).%New()
        set result.status="failed",result.reason="rotation-enumeration-failed"
    }
    write result.%ToJSON()
    quit $$$OK
}

ClassMethod MessageRotation() As %Status
{
    set %response.ContentType="application/json; charset=utf-8"
    set sourceIdentity=$get(%request.Data("id",1)),invalidQuery=$data(%request.Data("id",2))
    for {
        set queryKey=$order(%request.Data(queryKey))
        quit:queryKey=""
        if queryKey'="id" set invalidQuery=1
    }
    set result=##class(%DynamicObject).%New()
    if invalidQuery {
        set result.status="unavailable",result.reason="invalid-source-identity"
        set %response.Status=400
    } else {
        set sc=##class(OpsDeck.Product.FixedLogReader).ReadMessageRotation(sourceIdentity,.result)
        if $$$ISERR(sc) {
            set result.status="read-failure",result.reason="provider-failed"
        }
        if (result.status="available")||(result.status="empty")||(result.status="truncated") {
            try {
                set analysisJSON=##class(OpsDeck.Product.LogInterpreter).Analyze(sourceIdentity,result.%ToJSON())
                set result.analysis=##class(%DynamicObject).%FromJSON(analysisJSON)
            } catch exception {
                set result.analysis=..AnalysisState(sourceIdentity,"failed","analysis-failed")
            }
        }
    }
    write result.%ToJSON()
    quit $$$OK
}

ClassMethod InstalledPackages() As %Status
{
    set %response.ContentType="application/json; charset=utf-8"
    set result=##class(%DynamicObject).%New()
    set result.provider="iris-ipm-installed-v1"
    set result.namespace=$namespace
    set result.packages=##class(%DynamicArray).%New()
    set result.truncated=0
    if '$SYSTEM.SQL.Security.CheckPrivilege($USERNAME,1,"%IPM_Storage.ModuleItem","s",$NAMESPACE) {
        set result.status="denied"
        set result.reason="installed-module-read-required"
        write result.%ToJSON()
        quit $$$OK
    }
    try {
        do ##class(%IPM.Main).GetListModules($namespace,"*",.modules)
        set count=modules
        set result.truncated=(count>250)
        set limit=$select(count>250:250,1:count)
        for index=1:1:limit {
            set item=##class(%DynamicObject).%New()
            set item.name=$listget(modules(index),1)
            set item.installedVersion=$listget(modules(index),2)
            do result.packages.%Push(item)
        }
        set result.status=$select(result.truncated:"truncated",count:"available",1:"empty")
    } catch exception {
        set result.packages=##class(%DynamicArray).%New()
        set result.truncated=0
        set result.status="failed"
        set result.reason="inventory-unavailable"
    }
    write result.%ToJSON()
    quit $$$OK
}

ClassMethod AvailablePackages() As %Status
{
    set %response.ContentType="application/json; charset=utf-8"
    set packageName=$get(%request.Data("name",1))
    set queryKey="",invalidQuery=$data(%request.Data("name",2))
    for {
        set queryKey=$order(%request.Data(queryKey))
        quit:queryKey=""
        if queryKey'="name" set invalidQuery=1
    }
    if invalidQuery {
        set result=##class(%DynamicObject).%New()
        set result.provider="iris-ipm-available-v1",result.namespace=$namespace,result.name=packageName
        set result.packages=##class(%DynamicArray).%New(),result.truncated=0,result.repositoryCount=0,result.availableRepositoryCount=0,result.coverage="unknown"
        set result.status="failed",result.reason="invalid-package-query"
        set %response.Status=400
    } elseif (packageName="")||($length(packageName)>128)||($extract(packageName,1)'?1AN)||($translate(packageName,"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-","")'="") {
        set result=##class(%DynamicObject).%New()
        set result.provider="iris-ipm-available-v1",result.namespace=$namespace,result.name=packageName
        set result.packages=##class(%DynamicArray).%New(),result.truncated=0,result.repositoryCount=0,result.availableRepositoryCount=0,result.coverage="unknown"
        set result.status="failed",result.reason="invalid-package-query"
        set %response.Status=400
    } else {
        set result=..SearchAvailablePackages(packageName)
    }
    write result.%ToJSON()
    quit $$$OK
}

ClassMethod SearchAvailablePackages(pName As %String) As %DynamicObject
{
    set pName=$ZCONVERT(pName,"L")
    set result=##class(%DynamicObject).%New()
    set result.provider="iris-ipm-available-v1"
    set result.namespace=$namespace
    set result.name=pName
    set result.packages=##class(%DynamicArray).%New()
    set result.truncated=0
    set result.repositoryCount=0
    set result.availableRepositoryCount=0
    set result.coverage="unknown"
    if '$SYSTEM.SQL.Security.CheckPrivilege($USERNAME,1,"%IPM_Repo.Definition","s",$NAMESPACE) {
        set result.status="denied"
        set result.reason="repository-definition-read-required"
        quit result
    }
    if (pName="")||($length(pName)>128)||($extract(pName,1)'?1AN)||($translate(pName,"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-","")'="") {
        set result.status="failed"
        set result.reason="invalid-package-query"
        quit result
    }
    try {
        set repositoryLimit=0
        set statement=##class(%SQL.Statement).%New()
        set sc=statement.%Prepare("SELECT Name FROM %IPM_Repo.Definition WHERE Enabled = 1 ORDER BY Name")
        if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
        set repositories=statement.%Execute()
        set repositoryCount=0
        while repositories.%Next(.sc) {
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set repositoryCount=repositoryCount+1
            if repositoryCount>5 {
                set repositoryLimit=1
                quit
            }
            set repositoryNames(repositoryCount)=repositories.%Get("Name")
        }
        if repositoryLimit {
            set result.repositoryCount=0
            set result.status="unavailable"
            set result.reason="configured-repository-limit-exceeded"
        } else {
            set result.repositoryCount=repositoryCount
            if repositoryCount=0 {
                set result.status="unavailable"
                set result.reason="no-enabled-repositories"
            } else {
                set manager=##class(%IPM.Repo.Manager).%Get(.sc)
                if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
                set availableCount=0
                for index=1:1:repositoryCount {
                    set service=manager.CheckServiceCache(repositoryNames(index),.serviceAvailable)
                    if $isobject(service),$classname(service)="%IPM.Repo.Filesystem.PackageService" {
                        if '$SYSTEM.SQL.Security.CheckPrivilege($username,9,"%IPM_Repo_Filesystem.Cache_OrderedMatches","e",$namespace) {
                            set result.status="denied",result.reason="repository-cache-query-execute-required"
                            return result
                        }
                    }
                    if serviceAvailable set availableCount=availableCount+1
                }
                set result.availableRepositoryCount=availableCount
                set result.coverage=$select(availableCount=repositoryCount:"complete",1:"partial")
                if availableCount=0 {
                    set result.status="unavailable"
                    set result.reason="configured-repositories-unavailable"
                } else {
                    for index=1:1:repositoryCount {
                        set criteria=##class(%IPM.Repo.SearchCriteria).%New()
                        set criteria.Name=pName
                        set criteria.Registry=repositoryNames(index)
                        set criteria.AllVersions=0
                        set sc=##class(%IPM.Repo.Utils).SearchRepositoriesForModule(criteria,.matches)
                        if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
                        for rowIndex=1:1:matches.Count() {
                            if result.packages.%Size()=50 {
                                set result.truncated=1
                                quit
                            }
                            set match=matches.GetAt(rowIndex)
                            set row=##class(%DynamicObject).%New()
                            set row.name=match.Name
                            set row.availableVersion=match.VersionString
                            set row.repository=match.ServerName
                            if match.Repository'="" set row.repositoryModule=match.Repository
                            if match.Origin'="" set row.origin=match.Origin
                            if match.Description'="" set row.description=$extract(match.Description,1,512)
                            do result.packages.%Push(row)
                        }
                        if result.truncated quit
                    }
                    if result.truncated {
                        set result.status="truncated"
                    } elseif result.packages.%Size()>0 {
                        set result.status="available"
                    } elseif result.coverage="complete" {
                        set result.status="empty"
                    } else {
                        set result.status="unavailable"
                        set result.reason="partial-repository-availability"
                    }
                }
            }
        }
    } catch exception {
        set result.packages=##class(%DynamicArray).%New()
        set result.truncated=0
        set result.status="failed"
        set result.reason="catalog-query-failed"
    }
    quit result
}

ClassMethod WriteSource(sourceId As %String) [ Private ]
{
    set %response.ContentType="application/json; charset=utf-8"
    set sc=##class(OpsDeck.Product.FixedLogReader).Read(sourceId,.result)
    if $$$ISERR(sc) {
        set result=##class(%DynamicObject).%New()
        set result.status="read-failure",result.reason="provider-failed"
    }
    if (result.status="available")||(result.status="empty")||(result.status="truncated") {
        try {
            set analysisJSON=##class(OpsDeck.Product.LogInterpreter).Analyze(sourceId,result.%ToJSON())
            set result.analysis=##class(%DynamicObject).%FromJSON(analysisJSON)
        } catch exception {
            set result.analysis=..AnalysisState(sourceId,"failed","analysis-failed")
        }
    } else {
        set reason=""
        if $data(result.reason) set reason=result.reason
        set result.analysis=..AnalysisState(sourceId,result.status,reason)
    }
    write result.%ToJSON()
    quit
}

ClassMethod AnalysisState(sourceId As %String, status As %String, reason As %String) As %DynamicObject [ Private ]
{
    set result=##class(%DynamicObject).%New()
    set result.provider="opsdeck-embedded-python-log-analysis-v1"
    set result.sourceId=sourceId
    set result.status=status
    set result.lineCount=0
    set result.findingCount=0
    set result.truncated=0
    set result.findingsTruncated=0
    set result.findings=##class(%DynamicArray).%New()
    if reason'="" set result.reason=reason
    quit result
}
}
