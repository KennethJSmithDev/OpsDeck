/// Fixed-source, caller-scoped derived search. No caller SQL, vector, path or execution input.
Class OpsDeck.Product.DerivedSearch Extends %CSP.REST
{
ClassMethod Allowed(pWrite As %Boolean = 0) As %Boolean
{
    if '$SYSTEM.Security.Check("%Admin_Operate","USE") quit 0
    if '$SYSTEM.Security.Check("%DB_OPSDECK",$select(pWrite:"WRITE",1:"READ")) quit 0
    if '$SYSTEM.SQL.Security.CheckPrivilege($username,1,"OpsDeckDerived.VectorRecord","s","OPSDECK") quit 0
    if pWrite {
        if '$SYSTEM.SQL.Security.CheckPrivilege($username,1,"OpsDeckDerived.VectorRecord","i","OPSDECK") quit 0
        if '$SYSTEM.SQL.Security.CheckPrivilege($username,1,"OpsDeckDerived.VectorRecord","d","OPSDECK") quit 0
    }
    quit 1
}

ClassMethod Envelope() As %DynamicObject [ Private ]
{
    set result=##class(%DynamicObject).%New(),result.provider="opsdeck-derived-search-v1",result.model="opsdeck-concepts-v1"
    set result.username=$username,result.namespace=$namespace,result.derivedNamespace="OPSDECK",result.state="UNAVAILABLE"
    set result.results=##class(%DynamicArray).%New(),result.similarityIsProof=0
    quit result
}

ClassMethod Query() As %Status
{
    set %response.ContentType="application/json; charset=utf-8",result=..Envelope()
    set query=$get(%request.Data("q",1)),key="",invalid=$data(%request.Data("q",2))
    for {set key=$order(%request.Data(key)) if key="" quit  if key'="q" set invalid=1}
    if invalid||(query="")||($length(query)>256) {
        set %response.Status=400,result.state="FAILED",result.reason="invalid-query"
    } elseif '##class(%SYS.Namespace).Exists("OPSDECK") {
        set result.reason="derived-store-unavailable"
    } elseif '..Allowed() {
        set %response.Status=403,result.state="DENIED",result.reason="derived-read-authority-required"
    } else {
        try {
            set concept=##class(%DynamicObject).%FromJSON(##class(OpsDeck.Product.LogInterpreter).ConceptVector(query))
            if concept.text="" {
                set result.state="UNAVAILABLE",result.reason="no-supported-concept"
            } else {
                set result.results=##class(OpsDeck.Product.DerivedVector).Similar(concept.vector,..Scope())
                set result.state="SUPPORTED",result.normalizedQuery=concept.text
            }
        } catch exception {
            set %response.Status=500,result.state="FAILED",result.reason="derived-query-failed"
        }
    }
    write result.%ToJSON()
    quit $$$OK
}

ClassMethod Refresh() As %Status
{
    set %response.ContentType="application/json; charset=utf-8",result=..Envelope(),original=$namespace,initialLevel=$tlevel
    if '##class(%SYS.Namespace).Exists("OPSDECK") {
        set result.reason="derived-store-unavailable"
    } elseif '..Allowed(1) {
        set %response.Status=403,result.state="DENIED",result.reason="derived-write-authority-required"
    } else {
        try {
            if %request.Content.Size>1024 throw ##class(%Exception.General).%New("invalid-refresh")
            set input=##class(%DynamicObject).%FromJSON(%request.Content)
            if (input.%Size()'=1)||(input.%GetTypeOf("sourceId")'="string") throw ##class(%Exception.General).%New("invalid-refresh")
            set source=input.sourceId
            if (source'="messagesLog")&&(source'="systemMonitorLog") throw ##class(%Exception.General).%New("invalid-refresh")
            set sc=##class(OpsDeck.Product.FixedLogReader).Read(source,.observation)
            if $$$ISERR(sc) throw ##class(%Exception.General).%New("source-read-failed")
            if (observation.status'="available")&&(observation.status'="empty")&&(observation.status'="truncated") {
                set result.state=$select(observation.status="denied":"DENIED",observation.status="unavailable":"UNAVAILABLE",1:"FAILED"),result.reason="source-not-observed"
            } else {
                set analysis=##class(%DynamicObject).%FromJSON(##class(OpsDeck.Product.LogInterpreter).Analyze(source,observation.%ToJSON()))
                set records=##class(%DynamicArray).%New(),scope=..Scope(),observed=$zdatetime($horolog,3,1)
                for i=0:1:analysis.findings.%Size()-1 {
                    set finding=analysis.findings.%Get(i),line=observation.lines.%Get(finding.lineNumber-1)
                    set concept=##class(%DynamicObject).%FromJSON(##class(OpsDeck.Product.LogInterpreter).ConceptVector(line))
                    if concept.text'="" {
                        set record=##class(%DynamicObject).%New(),record.id=scope_..Hash(source_":"_observed_":"_finding.id)
                        set record.sourceIdentity=source,record.sourceTimestamp="UNKNOWN",record.text=concept.text,record.vector=concept.vector
                        set record.fingerprint=..Hash(concept.text),record.evidenceRef="fixed-log:"_source_":observed-"_observed_":line-"_finding.lineNumber
                        do records.%Push(record)
                    }
                }
                zn "OPSDECK"
                tstart
                set statement=##class(%SQL.Statement).%New(),sc=statement.%Prepare("DELETE FROM OpsDeckDerived.VectorRecord WHERE RecordID %STARTSWITH ? AND SourceIdentity=?")
                if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
                set sql=statement.%Execute(scope,source)
                if sql.%SQLCODE<0 throw ##class(%Exception.General).%New("derived-delete-failed")
                set statement=##class(%SQL.Statement).%New(),sc=statement.%Prepare("SELECT COUNT(*) AS Total FROM OpsDeckDerived.VectorRecord")
                if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
                set sql=statement.%Execute()
                if sql.%SQLCODE<0 throw ##class(%Exception.General).%New("derived-count-failed")
                if sql.%Next(),(sql.Total+records.%Size()>500) throw ##class(%Exception.General).%New("derived-record-cap")
                set statement=##class(%SQL.Statement).%New(),sc=statement.%Prepare("INSERT INTO OpsDeckDerived.VectorRecord (RecordID,SourceIdentity,SourceTimestamp,NormalizedText,Fingerprint,EvidenceRef,Embedding) VALUES (?,?,?,?,?,?,TO_VECTOR(?,double,16))")
                if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
                for i=0:1:records.%Size()-1 {
                    set record=records.%Get(i),sql=statement.%Execute(record.id,record.sourceIdentity,record.sourceTimestamp,record.text,record.fingerprint,record.evidenceRef,record.vector)
                    if sql.%SQLCODE<0 throw ##class(%Exception.General).%New("derived-insert-failed")
                }
                tcommit
                zn original
                set result.state="SUPPORTED",result.sourceIdentity=source,result.observedAt=observed,result.observationTimezone="server-local"
                set result.indexedCount=records.%Size(),result.truncated=observation.truncated,result.findingsTruncated=analysis.findingsTruncated
            }
        } catch exception {
            if $tlevel>initialLevel trollback 1
            zn original
            set %response.Status=500,result.state="FAILED",result.reason="derived-refresh-failed"
        }
    }
    write result.%ToJSON()
    quit $$$OK
}

/// Deterministic opaque caller prefix; never accept a browser-selected identity.
ClassMethod Scope() As %String
{
    quit $extract(..Hash($username),1,32)_":"
}

ClassMethod Hash(pValue As %String) As %String
{
    set bytes=$SYSTEM.Encryption.SHAHash(256,pValue),hex="",digits="0123456789abcdef"
    for i=1:1:$length(bytes) {set n=$ascii(bytes,i),hex=hex_$extract(digits,(n\16)+1)_$extract(digits,(n#16)+1)}
    quit hex
}
}
