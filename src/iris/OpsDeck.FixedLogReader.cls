Class OpsDeck.FixedLogReader Extends %RegisteredObject
{

/// Read one of two fixed IRIS-owned logs. No caller-controlled path is accepted.
/// This source is not included in the IPM module until its privilege contract is qualified.
/// The reader observes only a bounded tail window and returns at most 250 complete lines.
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

        // Observe at most the final 64 KiB. When the file is larger, read one
        // context byte immediately before the bounded window so a partial
        // first line can be discarded without exposing earlier content.
        set fileSize=file.Size
        if fileSize<0 {
            do file.Close()
            set result.status="unavailable", result.reason="source-size-unavailable"
            quit $$$OK
        }
        set windowed=fileSize>65536
        set windowStart=$select(windowed:fileSize-65536,1:1)
        if 'file.MoveTo(windowStart) {
            do file.Close()
            set result.status="read-failure", result.reason="source-position-failed"
            quit $$$OK
        }
        set readLimit=$select(windowed:65537,1:65536)
        set content=file.Read(readLimit,.readStatus)
        do file.Close()
        if $$$ISERR(readStatus) {
            set result.status="read-failure", result.reason="source-read-failed"
            quit $$$OK
        }

        set truncated=windowed
        if windowed {
            set context=$extract(content,1,1)
            set content=$extract(content,2,*)
            if context'=$char(10) {
                set firstBreak=$find(content,$char(10))
                if firstBreak {
                    set content=$extract(content,firstBreak,*)
                } else {
                    set content=""
                }
            }
        }

        if content="" {
            set result.status=$select(truncated:"truncated",1:"empty")
            set result.lines=##class(%DynamicArray).%New()
            set result.truncated=truncated
            set result.bytesReturned=0
            quit $$$OK
        }

        // Keep the newest complete lines inside the bounded byte window.
        set pieceCount=$length(content,$char(10))
        if $piece(content,$char(10),pieceCount)="" set pieceCount=pieceCount-1
        set firstPiece=1
        if pieceCount>250 {
            set firstPiece=pieceCount-249
            set truncated=1
        }

        set result.lines=##class(%DynamicArray).%New()
        set rowCount=0, bytesReturned=0
        for index=firstPiece:1:pieceCount {
            set line=$piece(content,$char(10),index)
            // The API is an array of lines. Preserve TAB but remove embedded
            // line/control characters, including CR from CRLF input.
            set line=$translate(line,$char(0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,127),"")
            do result.lines.%Push(line)
            set rowCount=rowCount+1
            set bytesReturned=bytesReturned+$zlength(line)
        }

        set result.status=$select(truncated:"truncated",rowCount:"available",1:"empty")
        set result.truncated=truncated
        set result.bytesReturned=bytesReturned
    } catch exception {
        set result.status="read-failure", result.reason="source-read-failed"
    }
    quit $$$OK
}

}
