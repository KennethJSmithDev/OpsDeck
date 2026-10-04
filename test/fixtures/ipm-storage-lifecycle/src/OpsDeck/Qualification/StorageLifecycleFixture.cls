/// Qualification-only IPM processor. Fixed identities are safe only in the named disposable target.
Class OpsDeck.Qualification.StorageLifecycleFixture Extends %IPM.ResourceProcessor.Abstract
{
Method OnAfterPhase(pPhase As %String, ByRef pParams) As %Status
{
    // The processor class must be compiled before its package lifecycle callback can run.
    if pPhase'="Configure" quit $$$OK
    if ##class(%SYS.Namespace).Exists("OPSDECK_STORAGE_FIXTURE") {
        quit $$$ERROR($$$GeneralError,"Refusing to replace an existing fixture namespace")
    }
    quit ..RunSQL("CREATE DATABASE OPSDECK_STORAGE_FIXTURE ON DIRECTORY '/durable/iris/mgr/OPSDECK_STORAGE_FIXTURE' WITH GLOBAL_JOURNAL_STATE=YES")
}

Method OnPhase(pPhase As %String, ByRef pParams, Output pResourceHandled As %Boolean = 0) As %Status
{
    if pPhase'="Clean" quit $$$OK
    if ##class(%SYS.Namespace).Exists("OPSDECK_STORAGE_FIXTURE") {
        set tSC=..RunSQL("DROP DATABASE OPSDECK_STORAGE_FIXTURE")
        if $$$ISERR(tSC) quit tSC
        if ##class(%SYS.Namespace).Exists("OPSDECK_STORAGE_FIXTURE") {
            quit $$$ERROR($$$GeneralError,"Fixture namespace remains after DROP DATABASE")
        }
    }
    set pResourceHandled=1
    quit $$$OK
}

ClassMethod RunSQL(pSQL As %String) As %Status
{
    set statement=##class(%SQL.Statement).%New()
    set tSC=statement.%Prepare(pSQL)
    if $$$ISERR(tSC) quit tSC
    set result=statement.%Execute()
    if result.%SQLCODE<0 {
        quit $$$ERROR($$$GeneralError,"Fixture database SQL failed")
    }
    quit $$$OK
}
}
