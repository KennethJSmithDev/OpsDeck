Class OpsDeck.Product.FixedLogReader Extends %RegisteredObject
{

/// Read only the current canonical logs or one server-identified messages.log rotation.
/// No caller-controlled filesystem path is accepted.
ClassMethod Read(sourceId As %String, ByRef result As %DynamicObject) As %Status
{
    set result=##class(%DynamicObject).%New()
    if (sourceId'="messagesLog")&&(sourceId'="systemMonitorLog") {
        set result.status="unavailable",result.reason="unsupported-source"
        quit $$$OK
    }
    if '$SYSTEM.Security.Check("%Admin_Operate","USE") {
        set result.status="denied", result.reason="admin-operate-required"
        quit $$$OK
    }
    try {
        set canResolve=1
        if sourceId="messagesLog" {
            set path=##class(Config.config).GetConsoleFileName(.configStatus)
            if $$$ISERR(configStatus) {
                set result.status="unavailable",result.reason="source-location-unavailable"
                set canResolve=0
            }
        } else {
            set path=##class(%File).ManagerDirectory()_"SystemMonitor.log"
        }
        if canResolve do ..ReadResolvedFile(path,.result)
    } catch exception {
        set result.status="read-failure", result.reason="source-read-failed"
    }
    quit $$$OK
}

/// List a bounded, nonrecursive sibling family of regular rotated messages logs.
/// Items contain opaque identities and observed timestamps, never paths or basenames.
ClassMethod ListMessageRotations(ByRef result As %DynamicObject) As %Status
{
    set result=##class(%DynamicObject).%New()
    set result.provider="opsdeck-rotated-messages-log-v1"
    set result.rotations=##class(%DynamicArray).%New()
    set result.scannedCount=0
    do result.%Set("truncated",0,"boolean")
    if '$SYSTEM.Security.Check("%Admin_Operate","USE") {
        set result.status="denied",result.reason="admin-operate-required"
        quit $$$OK
    }
    try {
        do ..EnumerateMessageRotations(.records,.count,.scanned,.truncated,.state)
        if state'="available" {
            set result.status=state,result.reason="rotation-enumeration-"_state
        } else {
            set result.scannedCount=scanned
            do result.%Set("truncated",truncated,"boolean")
            set limit=$select(count>20:20,1:count)
            if count>20 do result.%Set("truncated",1,"boolean")
            for index=1:1:limit {
                set item=##class(%DynamicObject).%New()
                set item.sourceIdentity=records(index,"identity")
                set item.sourceTimestamp=records(index,"modified")
                set item.size=records(index,"size")
                do result.rotations.%Push(item)
            }
            set result.status=$select(result.truncated:"truncated",count:"available",1:"empty")
            set result.coverage=$select(result.truncated:"partial",1:"complete")
            set result.count=limit
        }
    } catch exception {
        set result.rotations=##class(%DynamicArray).%New()
        set result.status="failed",result.reason="rotation-enumeration-failed"
    }
    quit $$$OK
}

/// Re-resolve one opaque identity inside the fixed family and read its bounded tail.
ClassMethod ReadMessageRotation(sourceIdentity As %String, ByRef result As %DynamicObject) As %Status
{
    set result=##class(%DynamicObject).%New()
    if '$SYSTEM.Security.Check("%Admin_Operate","USE") {
        set result.status="denied",result.reason="admin-operate-required"
        quit $$$OK
    }
    if sourceIdentity'?1"messagesRotation:"64UN {
        set result.status="unavailable",result.reason="unsupported-source"
        quit $$$OK
    }
    try {
        do ..EnumerateMessageRotations(.records,.count,.scanned,.truncated,.state)
        if state'="available" {
            set result.status=state,result.reason="rotation-enumeration-"_state
        } else {
            set matches=0,selectedPath="",selectedTimestamp=""
            for index=1:1:count {
                if records(index,"identity")=sourceIdentity {
                    set matches=matches+1,selectedPath=records(index,"path"),selectedTimestamp=records(index,"modified")
                }
            }
            if matches'=1 {
                set result.status="unavailable",result.reason=$select(matches>1:"rotation-identity-ambiguous",truncated:"rotation-outside-bounded-observation",1:"rotation-identity-not-found")
            } else {
                do ..ReadResolvedFile(selectedPath,.result)
                set result.sourceIdentity=sourceIdentity,result.sourceTimestamp=selectedTimestamp
            }
        }
    } catch exception {
        set result.status="read-failure", result.reason="source-read-failed"
    }
    quit $$$OK
}

ClassMethod EnumerateMessageRotations(ByRef records, ByRef count As %Integer, ByRef scanned As %Integer, ByRef truncated As %Boolean, ByRef state As %String) As %Status [ Private ]
{
    kill records
    set count=0,scanned=0,truncated=0,state="available"
    set currentPath=##class(Config.config).GetConsoleFileName(.configStatus)
    if $$$ISERR(configStatus) {
        set state="unavailable"
        quit $$$OK
    }
    set separator=0
    for position=1:1:$length(currentPath) {
        set character=$extract(currentPath,position)
        if (character="/")||(character="\") set separator=position
    }
    if 'separator {
        set state="unavailable"
        quit $$$OK
    }
    set directory=$extract(currentPath,1,separator)
    set statement=##class(%SQL.Statement).%New()
    set sc=statement.%PrepareClassQuery("%File","FileSet")
    if $$$ISERR(sc) {
        set state="failed"
        quit $$$OK
    }
    set files=statement.%Execute(directory,"messages.old_*","DateModified")
    if files.%SQLCODE'=0 {
        set state="failed"
        quit $$$OK
    }
    while files.%Next() {
        set scanned=scanned+1
        if scanned>250 {
            set truncated=1
            quit
        }
        if files.%Get("Type")="F" {
            set count=count+1
            set records(count,"path")=files.%Get("Name")
            set records(count,"name")=files.%Get("ItemName")
            set records(count,"size")=files.%Get("Size")
            set records(count,"modified")=files.%Get("DateModified")
        }
    }
    if files.%SQLCODE<0 {
        kill records
        set count=0,state="failed"
        quit $$$OK
    }
    for index=1:1:count {
        set records(index,"identity")="messagesRotation:"_$SYSTEM.Encryption.ToHex($SYSTEM.Encryption.SHAHash(256,records(index,"name")_"|"_records(index,"size")_"|"_records(index,"modified")))
    }
    // Sort the bounded observed subset newest-first for compact presentation.
    for index=1:1:count {
        for next=index+1:1:count {
            if records(next,"modified")>records(index,"modified") {
                set temp=records(index,"path"),records(index,"path")=records(next,"path"),records(next,"path")=temp
                set temp=records(index,"name"),records(index,"name")=records(next,"name"),records(next,"name")=temp
                set temp=records(index,"size"),records(index,"size")=records(next,"size"),records(next,"size")=temp
                set temp=records(index,"modified"),records(index,"modified")=records(next,"modified"),records(next,"modified")=temp
                set temp=records(index,"identity"),records(index,"identity")=records(next,"identity"),records(next,"identity")=temp
            }
        }
    }
    quit $$$OK
}

ClassMethod ReadResolvedFile(path As %String, ByRef result As %DynamicObject) As %Status [ Private ]
{
    set canRead=1
    try {
        set file=##class(%Stream.FileBinary).%New()
        set openStatus=file.LinkToFile(path)
        if $$$ISERR(openStatus) {
            set result.status="unavailable",result.reason="source-open-failed"
            set canRead=0
        }
        if canRead {
            set fileSize=file.FileBinarySize()
            if fileSize<0 {
                set result.status="unavailable",result.reason="source-size-unavailable"
                set canRead=0
            }
        }
        if canRead {
            set windowed=fileSize>65536
            set windowStart=$select(windowed:fileSize-65536,1:1)
            if windowStart>1,'file.MoveTo(windowStart) {
                set result.status="read-failure",result.reason="source-position-failed"
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
        if $isobject(file) set file=""
        if canRead do ..ProjectLines(content,windowed,.result)
    } catch exception {
        if $isobject(file) set file=""
        set result.status="read-failure", result.reason="source-read-failed"
    }
    quit $$$OK
}

ClassMethod ProjectLines(content As %String, windowed As %Boolean, ByRef result As %DynamicObject) As %Status [ Private ]
{
    set truncated=windowed
    if windowed {
        set context=$extract(content,1,1)
        set content=$extract(content,2,*)
        if context'=$char(10) {
            set firstBreak=$find(content,$char(10))
            if firstBreak set content=$extract(content,firstBreak,*)
            else  set content=""
        }
    }
    if content="" {
        set result.status=$select(truncated:"truncated",1:"empty")
        set result.lines=##class(%DynamicArray).%New()
        set result.truncated=truncated
        quit $$$OK
    }
    set pieceCount=$length(content,$char(10))
    if $piece(content,$char(10),pieceCount)="" set pieceCount=pieceCount-1
    set firstPiece=1
    if pieceCount>250 {
        set firstPiece=pieceCount-249
        set truncated=1
    }
    set keepFrom=pieceCount+1,projectionUnits=0
    for index=pieceCount:-1:firstPiece {
        set line=$piece(content,$char(10),index)
        set line=$translate(line,$char(0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,127),"")
        set lineUnits=$length(line)
        if lineUnits>2048 set truncated=1 quit
        if projectionUnits+lineUnits>6500 set truncated=1 quit
        set keepFrom=index,projectionUnits=projectionUnits+lineUnits
    }
    set lines=##class(%DynamicArray).%New(),rowCount=0
    for index=keepFrom:1:pieceCount {
        set line=$piece(content,$char(10),index)
        set line=$translate(line,$char(0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,127),"")
        do lines.%Push(line)
        set rowCount=rowCount+1
    }
    set result.lines=lines
    set result.status=$select(truncated:"truncated",rowCount:"available",1:"empty")
    set result.truncated=truncated
    quit $$$OK
}

}
