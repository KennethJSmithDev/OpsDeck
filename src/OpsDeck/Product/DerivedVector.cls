/// Closed, rebuildable IRIS Vector schema. Never mirrors authoritative management state.
Class OpsDeck.Product.DerivedVector Extends %RegisteredObject
{
ClassMethod InstallSchema() As %Status
{
    set original=$namespace,sc=$$$OK,created=0
    zn "OPSDECK"
    try {
        if $SYSTEM.SQL.Schema.TableExists("OpsDeckDerived.VectorRecord") throw ##class(%Exception.General).%New("derived-vector-schema-collision")
        do ..Execute("CREATE TABLE OpsDeckDerived.VectorRecord (RecordID VARCHAR(128) PRIMARY KEY, SourceIdentity VARCHAR(128) NOT NULL, SourceTimestamp VARCHAR(40) NOT NULL, NormalizedText VARCHAR(512) NOT NULL, Fingerprint VARCHAR(64) NOT NULL, EvidenceRef VARCHAR(256) NOT NULL, Embedding VECTOR(DOUBLE,16) NOT NULL)")
        set created=1
        do ..Execute("CREATE INDEX Similarity ON OpsDeckDerived.VectorRecord (Embedding) AS HNSW(Distance='Cosine')")
    } catch exception {
        set sc=exception.AsStatus()
        if created {
            try { do ..Execute("DROP TABLE OpsDeckDerived.VectorRecord") } catch rollback { set sc=$SYSTEM.Status.AppendStatus(sc,rollback.AsStatus()) }
        }
    }
    zn original
    quit sc
}

/// Bounded native qualification query. Input vectors have exactly sixteen numeric components.
ClassMethod Similar(pVector As %String) As %DynamicArray
{
    if $length(pVector)>512 throw ##class(%Exception.General).%New("derived-vector-input-invalid")
    if $length(pVector,",")'=16 throw ##class(%Exception.General).%New("derived-vector-input-invalid")
    for i=1:1:16 { if $piece(pVector,",",i)'?1.N0.1"."0.N throw ##class(%Exception.General).%New("derived-vector-input-invalid") }
    set original=$namespace,rows=##class(%DynamicArray).%New()
    zn "OPSDECK"
    try {
        set statement=##class(%SQL.Statement).%New(),sc=statement.%Prepare("SELECT TOP 5 RecordID,SourceIdentity,SourceTimestamp,NormalizedText,Fingerprint,EvidenceRef,VECTOR_COSINE(Embedding,TO_VECTOR(?,double,16)) AS Similarity FROM OpsDeckDerived.VectorRecord ORDER BY Similarity DESC,RecordID")
        if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
        set result=statement.%Execute(pVector)
        if result.%SQLCODE<0 throw ##class(%Exception.General).%New("derived-vector-query-failed")
        while result.%Next() {
            set row=##class(%DynamicObject).%New(),row.id=result.RecordID,row.sourceIdentity=result.SourceIdentity,row.sourceTimestamp=result.SourceTimestamp
            set row.text=result.NormalizedText,row.fingerprint=result.Fingerprint,row.evidenceRef=result.EvidenceRef,row.similarity=result.Similarity
            do rows.%Push(row)
        }
    } catch exception { zn original throw exception }
    zn original
    quit rows
}

ClassMethod Execute(pSQL As %String) As %SQL.StatementResult [ Private ]
{
    set statement=##class(%SQL.Statement).%New(),sc=statement.%Prepare(pSQL)
    if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
    set result=statement.%Execute()
    if result.%SQLCODE<0 throw ##class(%Exception.General).%New("derived-vector-sql-failed")
    quit result
}
}
