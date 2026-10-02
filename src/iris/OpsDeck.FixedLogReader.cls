Class OpsDeck.FixedLogReader Extends %RegisteredObject
{

/// Read one of two fixed IRIS-owned logs. No caller-controlled path is accepted.
/// This source is not included in the IPM module until its privilege contract is qualified.
ClassMethod Read(sourceId As %String, ByRef result As %DynamicObject) As %Status
{
    set result = ##class(%DynamicObject).%New()
    if (sourceId'="messagesLog")&&(sourceId'="systemMonitorLog") {
        set result.status="unavailable", result.reason="unsupported-source"
        quit $$$OK
    }

    try {
        if sourceId="messagesLog" {
            set path=##class(Config.config).GetConsoleFileName(.configStatus)
            if $$$ISERR(configStatus) {
                set result.status="unavailable", result.reason="source-location-unavailable"
                quit $$$OK
            }
        } else {
            set path=##class(%File).ManagerDirectory()_"SystemMonitor.log"
        }

        set file=##class(%File).%New(path)
        set openStatus=file.Open("RB")
        if $$$ISERR(openStatus) {
            // Permission-denial classification needs an IRIS runtime control.
            set result.status="unavailable", result.reason="source-open-failed"
            quit $$$OK
        }

        // Read at most one byte beyond the response cap to detect truncation.
        set content=file.Read(65537,.readStatus)
        do file.Close()
        if $$$ISERR(readStatus) {
            set result.status="read-failure", result.reason="source-read-failed"
            quit $$$OK
        }
        if content="" {
            set result.status="empty", result.lines=##class(%DynamicArray).%New(), result.truncated=0, result.bytesReturned=0
            quit $$$OK
        }

        set truncated=$zlength(content)>65536
        if truncated set content=$extract(content,1,65536)
        set rows=$listbuild()
        set rowCount=0
        for index=1:1:$length(content,"\n") {
            set line=$piece(content,"\n",index)
            set line=$translate(line,$char(0,1,2,3,4,5,6,7,8,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,127),"")
            if line'="" {
                if rowCount=250 {
                    set truncated=1
                    quit
                }
                set rowCount=rowCount+1
                set rows=$listappend(rows,line)
            }
        }
        set result.status=$select(truncated:"truncated",rowCount:"available",1:"empty")
        set result.lines=##class(%DynamicArray).%New()
        for index=1:1:rowCount do result.lines.%Push($listget(rows,index))
        set result.truncated=truncated
        set result.bytesReturned=$zlength(content)
    } catch exception {
        set result.status="read-failure", result.reason="source-read-failed"
    }
    quit $$$OK
}

}
