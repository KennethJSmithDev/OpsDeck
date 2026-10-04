/// Closed IPM operations in the current product namespace. Never changes execution identity.
Class OpsDeck.Product.PackageOperations Extends %CSP.REST
{
ClassMethod Authority() As %Status
{
    set %response.ContentType="application/json; charset=utf-8"
    set result=##class(%DynamicObject).%New()
    set result.username=$username,result.namespace=$namespace,result.provider="iris-ipm-operations-v1"
    set result.state=$select(..Allowed():"SUPPORTED",1:"DENIED")
    write result.%ToJSON()
    quit $$$OK
}

ClassMethod Allowed() As %Boolean
{
    quit ($namespace="%SYS")&&$SYSTEM.Security.Check("%Admin_Secure","USE")&&$SYSTEM.Security.Check("%DB_IRISSYS","WRITE")&&$SYSTEM.SQL.Security.CheckPrivilege($username,1,"%IPM_Storage.ModuleItem","s",$namespace)&&$SYSTEM.SQL.Security.CheckPrivilege($username,1,"%IPM_Repo.Definition","s",$namespace)
}

ClassMethod Dispatch() As %Status
{
    set %response.ContentType="application/json; charset=utf-8"
    set result=##class(%DynamicObject).%New(),result.provider="iris-ipm-operations-v1"
    set result.username=$username,result.namespace=$namespace
    if '..Allowed() {
        set %response.Status=403,result.state="DENIED"
        write result.%ToJSON()
        quit $$$OK
    }
    set originalIO=$io,sink=$select($zversion(1)=3:"/dev/null",1:"NUL"),sinkOpen=0,started=0
    try {
        if %request.Content.Size>4096 throw ##class(%Exception.General).%New("invalid-input")
        set input=##class(%DynamicObject).%FromJSON(%request.Content)
        if input.%Size()'=6 throw ##class(%Exception.General).%New("invalid-input")
        set iterator=input.%GetIterator()
        while iterator.%GetNext(.key,.value) {
            if '$listfind($listbuild("action","name","version","repository","namespace","expectedInstalledVersion"),key) throw ##class(%Exception.General).%New("invalid-input")
            if input.%GetTypeOf(key)'="string" throw ##class(%Exception.General).%New("invalid-input")
        }
        set name=input.name,version=input.version,repository=input.repository
        if (input.namespace'=$namespace)||((input.action'="install")&&(input.action'="remove")) throw ##class(%Exception.General).%New("invalid-input")
        if (name="opsdeck")||(name="zpm")||($length(name)>128)||(name="")||(name'=$zconvert(name,"L"))||($extract(name,1)'?1AN)||($translate(name,"abcdefghijklmnopqrstuvwxyz0123456789_.-","")'="") throw ##class(%Exception.General).%New("invalid-input")
        if (version'?1.N1"."1.N1"."1.N)||($length(version)>64)||(repository="")||($length(repository)>128)||($translate(repository,"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-","")'="") throw ##class(%Exception.General).%New("invalid-input")
        do ##class(%IPM.Main).GetListModules($namespace,name,.modules)
        set installed=""
        for index=1:1:modules {
            if $listget(modules(index),1)=name set installed=$listget(modules(index),2)
        }
        if installed'=input.expectedInstalledVersion throw ##class(%Exception.General).%New("stale-input")
        if input.action="install" {
            if installed'="" throw ##class(%Exception.General).%New("stale-input")
            set catalog=##class(OpsDeck.Product.FixedLogREST).SearchAvailablePackages(name),matches=0
            for index=0:1:catalog.packages.%Size()-1 {
                set row=catalog.packages.%Get(index)
                if (row.name=name)&&(row.availableVersion=version)&&(row.repository=repository) set matches=matches+1
            }
            if matches'=1 throw ##class(%Exception.General).%New("catalog-input-unobserved")
        } else {
            if (installed="")||(installed'=version) throw ##class(%Exception.General).%New("stale-input")
        }
        set command("parameters","module")=$select(input.action="install":repository_"/"_name,1:name)
        set command("parameters","version")=version,command("data","Verbose")=0
        open sink:(writeonly):1
        if '$test throw ##class(%Exception.General).%New("output-sink-unavailable")
        set sinkOpen=1
        use sink
        set started=1
        if input.action="install" {
            set command="install"
            do ##class(%IPM.Main).Install(.command)
        } else {
            set command="uninstall"
            do ##class(%IPM.Main).Uninstall(.command)
        }
        use originalIO
        close sink
        set sinkOpen=0,result.state="ACCEPTED"
    } catch exception {
        use originalIO
        if sinkOpen close sink
        set %response.Status=$select(started:500,1:400)
        set result.state=$select(started:"AMBIGUOUS",1:"FAILED")
        set result.reason=$select(started:"ipm-outcome-unresolved",1:"input-or-prestate-rejected")
    }
    write result.%ToJSON()
    quit $$$OK
}
}
