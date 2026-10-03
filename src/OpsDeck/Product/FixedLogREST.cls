Class OpsDeck.Product.FixedLogREST Extends %CSP.REST
{
XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/messages" Method="GET" Call="MessagesLog" />
  <Route Url="/system-monitor" Method="GET" Call="SystemMonitorLog" />
  <Route Url="/packages" Method="GET" Call="InstalledPackages" />
</Routes>
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
