Class OpsDeck.FixedLogReader Extends %RegisteredObject
{

/// Read one of two fixed IRIS-owned logs. No caller-controlled path is accepted.
/// This source is not included in the IPM module until its privilege contract is qualified.
/// The reader observes only a bounded tail window and returns at most 250 complete lines.
ClassMethod Read(sourceId As %String, ByRef result As %DynamicObject) As %Status
{
    set result = ##class(%DynamicObject).%New()
    if (sourceId'="messagesLog")&&(sourceId'="systemMonitorLog") set result.status="unavailable", result.reason="unsupported-source" quit $$$OK

    // InterSystems documents %Admin_Operate:Use as the privilege for
    // System Operation pages and examining logs. Enforce it in the reader,
    // not merely in presentation or routing.
    if '$SYSTEM.Security.Check("%Admin_Operate","USE") set result.status="denied", result.reason="admin-operate-required" quit $$$OK

    set canRead=1
    try {
        if sourceId="messagesLog" {
            set path=##class(Config.config).GetConsoleFileName(.configStatus)
            if $$$ISERR(configStatus) {
                set result.status="unavailable", result.reason="source-location-unavailable"
                set canRead=0
            }
        } else {
            set path=##class(%File).ManagerDirectory()_"SystemMonitor.log"
        }

        if canRead {
            // %File wraps sequential file commands and has no MoveTo method.
            // FileBinary provides raw byte reads and positional movement.
            set file=##class(%Stream.FileBinary).%New()
            set openStatus=file.LinkToFile(path)
            if $$$ISERR(openStatus) {
                // Permission-denial classification needs an IRIS runtime control.
                set result.status="unavailable", result.reason="source-open-failed"
                set canRead=0
            }
        }

        // Observe at most 64 KiB, including one context byte before the
        // bounded tail. A partial first line can then be discarded.
        if canRead {
            set fileSize=file.FileBinarySize()
            if fileSize<0 {
                set result.status="unavailable", result.reason="source-size-unavailable"
                set canRead=0
            }
        }
        if canRead {
            set windowed=fileSize>65536
            set windowStart=$select(windowed:fileSize-65536,1:1)
            if windowStart>1,'file.MoveTo(windowStart) {
                set result.status="read-failure", result.reason="source-position-failed"
                set canRead=0
            }
        }
        if canRead {
            set readLimit=65536
            set content=file.Read(.readLimit,.readStatus)
            if $$$ISERR(readStatus) {
                set result.status="read-failure", result.reason="source-read-failed"
                set canRead=0
            }
        }

        // Drop the linked stream before building the response. IRIS closes a
        // file stream when its object reference is cleared.
        if $isobject(file) set file=""

        if canRead {
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
            } else {
                // Keep the newest complete lines inside the bounded byte window.
                set pieceCount=$length(content,$char(10))
                if $piece(content,$char(10),pieceCount)="" set pieceCount=pieceCount-1
                set firstPiece=1
                if pieceCount>250 {
                    set firstPiece=pieceCount-249
                    set truncated=1
                }

                set lines=##class(%DynamicArray).%New()
                set rowCount=0
                for index=firstPiece:1:pieceCount {
                    set line=$piece(content,$char(10),index)
                    // Preserve TAB; remove CR/LF and other control characters from each row.
                    set line=$translate(line,$char(0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,127),"")
                    do lines.%Push(line)
                    set rowCount=rowCount+1
                }

                set result.lines=lines
                set result.status=$select(truncated:"truncated",rowCount:"available",1:"empty")
                set result.truncated=truncated
            }
        }
    } catch exception {
        // Close a linked file stream on exceptional exits without clearing
        // or deleting the underlying permanent file.
        if $isobject(file) set file=""
        set result.status="read-failure", result.reason="source-read-failed"
    }
    quit $$$OK
}

}
