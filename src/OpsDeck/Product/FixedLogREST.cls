Class OpsDeck.Product.FixedLogREST Extends %CSP.REST
{
XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/messages" Method="GET" Call="MessagesLog" />
  <Route Url="/system-monitor" Method="GET" Call="SystemMonitorLog" />
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

ClassMethod WriteSource(sourceId As %String) [ Private ]
{
    set %response.ContentType="application/json; charset=utf-8"
    set sc=##class(OpsDeck.Product.FixedLogReader).Read(sourceId,.result)
    if $$$ISERR(sc) {
        set result=##class(%DynamicObject).%New()
        set result.status="read-failure",result.reason="provider-failed"
    }
    write result.%ToJSON()
    quit
}
}
