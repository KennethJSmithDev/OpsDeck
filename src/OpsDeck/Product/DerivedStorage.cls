/// Package lifecycle owner for rebuildable derived data. Installation grants no operator access.
Class OpsDeck.Product.DerivedStorage Extends %IPM.ResourceProcessor.Abstract
{
Parameter STORE = "OPSDECK";
Parameter RESOURCE = "%DB_OPSDECK";
Parameter DESCRIPTION = "OpsDeck owned rebuildable derived data";

Method OnBeforePhase(pPhase As %String, ByRef pParams) As %Status
{
    // Refuse before IPM unconfigures product applications or removes resources.
    if pPhase'="Clean" quit $$$OK
    quit ..CleanupPreflight()
}

/// Derived records are runtime cache, never package export inputs.
/// Configure reconstructs the owned schema from the shipped product classes.
Method OnExportItem(pFullExportPath As %String, pItemName As %String, ByRef pItemParams, ByRef pParams, Output pItemHandled As %Boolean = 0) As %Status
{
    set pItemHandled=1
    quit $$$OK
}

Method OnAfterPhase(pPhase As %String, ByRef pParams) As %Status
{
    if pPhase'="Configure" quit $$$OK
    quit ..Provision()
}

Method OnPhase(pPhase As %String, ByRef pParams, Output pResourceHandled As %Boolean = 0) As %Status
{
    if pPhase'="Clean" quit $$$OK
    set sc=..Remove()
    if $$$ISOK(sc) set pResourceHandled=1
    quit sc
}

ClassMethod Directory() As %String
{
    quit $SYSTEM.Util.ManagerDirectory()_"OPSDECK/"
}

ClassMethod Provision() As %Status
{
    // Physical database lifecycle cannot be rolled back by a surrounding IPM transaction.
    // The manifest supplies IPM's supported NoTransaction default; explicit overrides fail closed.
    if $tlevel>0 quit $$$ERROR($$$GeneralError,"Derived provisioning requires a nontransactional package lifecycle")
    set original=$namespace,sc=$$$OK,resourceCreated=0,directoryCreated=0,databaseCreated=0,configCreated=0,namespaceCreated=0
    zn "%SYS"
    lock +^OpsDeckDerivedLifecycle:5
    if '$test { zn original quit $$$ERROR($$$GeneralError,"Derived store lifecycle busy") }
    try {
        if ##class(%SYS.Namespace).Exists(..#STORE) {
            set sc=..Validate()
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
        } else {
            if ##class(Config.Databases).Exists(..#STORE)||##class(%File).DirectoryExists(..Directory())||##class(Security.Resources).Exists(..#RESOURCE)||##class(Security.Roles).Exists(..#RESOURCE) throw ##class(%Exception.General).%New("derived-store-collision")
            set sc=##class(Security.Resources).Create(..#RESOURCE,..#DESCRIPTION,0)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set resourceCreated=1
            if '##class(%File).CreateDirectory(..Directory()) throw ##class(%Exception.General).%New("derived-store-directory-create-failed")
            set directoryCreated=1
            set sc=##class(SYS.Database).CreateDatabase(..Directory(),1,,,..#RESOURCE,1)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set databaseCreated=1
            set properties("Directory")=..Directory()
            set sc=##class(Config.Databases).Create(..#STORE,.properties)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set configCreated=1
            kill properties
            set properties("Globals")=..#STORE,properties("Routines")=..#STORE
            set sc=##class(Config.Namespaces).Create(..#STORE,.properties)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set namespaceCreated=1
            set sc=##class(OpsDeck.Product.DerivedVector).InstallSchema()
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            zn "OPSDECK"
            set ^OpsDeckDerivedOwner("package")="opsdeck",^OpsDeckDerivedOwner("schema")=2
            set ^OpsDeckDerivedOwner("namespace")="OPSDECK",^OpsDeckDerivedOwner("database")="OPSDECK"
            set ^OpsDeckDerivedOwner("directory")=..Directory(),^OpsDeckDerivedOwner("resource")="%DB_OPSDECK"
            set definition=##class(%Dictionary.CompiledClass).%OpenId("OpsDeckDerived.VectorRecord"),storage=definition.Storages.GetAt(1)
            set location=storage.DataLocation
            if (location="")||($extract(location,1)'="^") throw ##class(%Exception.General).%New("derived-vector-storage-invalid")
            set ^OpsDeckDerivedOwner("vectorPrefix")=$piece($extract(location,2,*),".",1,*-1)_"."
            // Snapshot IRIS/schema metadata only after creating our exact table and index.
            set globals=##class(%SYS.GlobalQuery).DirectoryListFunc(..Directory(),"","*",1,0)
            while globals.%Next() {
                if globals.Name'="OpsDeckDerivedOwner" set ^OpsDeckDerivedOwner("baseline",globals.Name)=..Fingerprint(globals.Name)
            }
            zn "%SYS"
            set sc=..Validate()
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
        }
    } catch exception {
        zn "%SYS"
        set sc=exception.AsStatus()
        // Roll back only successful creations from this invocation, in reverse order.
        set rollback=$$$OK
        if $tlevel>0 {
            set rollback=$$$ERROR($$$GeneralError,"Derived cleanup deferred until the active transaction has ended; inspect incomplete ownership")
        } else {
            if namespaceCreated set rollback=##class(Config.Namespaces).Delete(..#STORE)
            if $$$ISOK(rollback),configCreated set rollback=##class(Config.Databases).Delete(..#STORE)
            if $$$ISOK(rollback),databaseCreated set rollback=##class(SYS.Database).DeleteDatabase(..Directory())
            if $$$ISOK(rollback),directoryCreated set rollback=..RemoveEmptyDirectories()
            if $$$ISOK(rollback),resourceCreated set rollback=##class(Security.Resources).Delete(..#RESOURCE)
        }
        if $$$ISERR(rollback) set sc=$SYSTEM.Status.AppendStatus(sc,rollback)
    }
    lock -^OpsDeckDerivedLifecycle
    zn original
    quit sc
}

/// Binding/contents validation must pass before upgrade or destructive cleanup.
ClassMethod Validate() As %Status
{
    set original=$namespace,sc=$$$OK
    zn "%SYS"
    try {
        if '##class(%SYS.Namespace).Exists(..#STORE) throw ##class(%Exception.General).%New("derived-store-namespace-absent")
        set sc=##class(Config.Namespaces).Get(..#STORE,.properties)
        if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
        if (properties("Globals")'=..#STORE)||(properties("Routines")'=..#STORE) throw ##class(%Exception.General).%New("derived-store-binding-conflict")
        kill properties
        set sc=##class(Config.Databases).Get(..#STORE,.properties)
        if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
        if properties("Directory")'=..Directory() throw ##class(%Exception.General).%New("derived-store-directory-conflict")
        if ..HasRows("SELECT Name FROM Config.Namespaces WHERE Name <> 'OPSDECK' AND (Globals='OPSDECK' OR Routines='OPSDECK' OR Library='OPSDECK' OR SysGlobals='OPSDECK' OR SysRoutines='OPSDECK' OR TempGlobals='OPSDECK')") throw ##class(%Exception.General).%New("derived-store-foreign-namespace")
        for table="Config.MapGlobals","Config.MapRoutines","Config.MapPackages" {
            if ..HasRows("SELECT Name FROM "_table_" WHERE Namespace='OPSDECK' OR Database='OPSDECK'") throw ##class(%Exception.General).%New("derived-store-mapping-conflict")
        }
        set database=##class(SYS.Database).%OpenId(..Directory())
        if '$isobject(database)||(database.ResourceName'=..#RESOURCE) throw ##class(%Exception.General).%New("derived-store-resource-conflict")
        kill properties
        set sc=##class(Security.Resources).Get(..#RESOURCE,.properties)
        if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
        if (properties("Description")'=..#DESCRIPTION)||((properties("PublicPermission")'="")&&(properties("PublicPermission")'=0)) throw ##class(%Exception.General).%New("derived-store-security-conflict")
        zn "OPSDECK"
        if ($get(^OpsDeckDerivedOwner("package"))'="opsdeck")||($get(^OpsDeckDerivedOwner("schema"))'=2)||($get(^OpsDeckDerivedOwner("namespace"))'="OPSDECK")||($get(^OpsDeckDerivedOwner("database"))'="OPSDECK")||($get(^OpsDeckDerivedOwner("directory"))'=..Directory())||($get(^OpsDeckDerivedOwner("resource"))'="%DB_OPSDECK") throw ##class(%Exception.General).%New("derived-store-owner-conflict")
        set prefix=$get(^OpsDeckDerivedOwner("vectorPrefix"))
        if (prefix="")||($length(prefix)<4) throw ##class(%Exception.General).%New("derived-vector-storage-invalid")
        set definition=##class(%Dictionary.CompiledClass).%OpenId("OpsDeckDerived.VectorRecord")
        if '$isobject(definition) throw ##class(%Exception.General).%New("derived-vector-schema-absent")
        set storage=definition.Storages.GetAt(1)
        if $extract(storage.DataLocation,2,$length(prefix)+1)'=prefix throw ##class(%Exception.General).%New("derived-vector-storage-conflict")
        zn "%SYS"
        set globals=##class(%SYS.GlobalQuery).DirectoryListFunc(..Directory(),"","*",1,0)
        while globals.%Next() {
            if (globals.Name'="OpsDeckDerivedOwner"),($extract(globals.Name,1,$length(prefix))'=prefix) {
                set name=globals.Name
                set expected=$get(^|"OPSDECK"|OpsDeckDerivedOwner("baseline",name)),actual=..Fingerprint(name)
                if expected="",..EmptyIRISHeader(name) set expected=$SYSTEM.Encryption.SHAHash(256,"")
                if expected'=actual throw ##class(%Exception.General).%New("derived-store-foreign-global")
            }
        }
        set files=##class(%File).FileSetFunc(..Directory(),"*","",1)
        while files.%Next() {
            if (files.Name'=(..Directory()_"IRIS.DAT"))&&(files.Name'=(..Directory()_"iris.lck"))&&(files.Name'=(..Directory()_"stream")) throw ##class(%Exception.General).%New("derived-store-foreign-file")
        }
        set files=##class(%File).FileSetFunc(..Directory()_"stream/","*","",1)
        if files.%Next() throw ##class(%Exception.General).%New("derived-store-foreign-stream")
    } catch exception { set sc=exception.AsStatus() }
    zn original
    quit sc
}

ClassMethod Remove() As %Status
{
    if $tlevel>0 quit $$$ERROR($$$GeneralError,"Derived removal requires a nontransactional package lifecycle")
    set original=$namespace,sc=$$$OK
    zn "%SYS"
    lock +^OpsDeckDerivedLifecycle:5
    if '$test { zn original quit $$$ERROR($$$GeneralError,"Derived store lifecycle busy") }
    try {
        // Complete absence is idempotent; partial absence is an ownership conflict.
        if '##class(%SYS.Namespace).Exists(..#STORE) {
            if ##class(Config.Databases).Exists(..#STORE)||##class(%File).DirectoryExists(..Directory())||##class(Security.Resources).Exists(..#RESOURCE)||##class(Security.Roles).Exists(..#RESOURCE) throw ##class(%Exception.General).%New("derived-store-partial-state")
        } else {
            set sc=..CleanupPreflight()
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set sc=##class(Config.Namespaces).Delete(..#STORE)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set sc=##class(Config.Databases).Delete(..#STORE)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set sc=##class(SYS.Database).DeleteDatabase(..Directory())
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set sc=..RemoveEmptyDirectories()
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set sc=##class(Security.Resources).Delete(..#RESOURCE)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            if ##class(%SYS.Namespace).Exists(..#STORE)||##class(Config.Databases).Exists(..#STORE)||##class(%File).DirectoryExists(..Directory())||##class(Security.Resources).Exists(..#RESOURCE)||##class(Security.Roles).Exists(..#RESOURCE) throw ##class(%Exception.General).%New("derived-store-cleanup-incomplete")
        }
    } catch exception { set sc=exception.AsStatus() }
    lock -^OpsDeckDerivedLifecycle
    zn original
    quit sc
}

ClassMethod CleanupPreflight() As %Status
{
    if $tlevel>0 quit $$$ERROR($$$GeneralError,"Derived removal requires a nontransactional package lifecycle")
    set original=$namespace,sc=$$$OK
    zn "%SYS"
    try {
        if ##class(%SYS.Namespace).Exists(..#STORE) {
            set sc=..Validate()
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            set sc=##class(Security.Resources).InUse(..#RESOURCE,.inUse,.roles,.databases,.applications)
            if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
            for i=1:1:$listlength(roles) { if $listget(roles,i)'=..#RESOURCE throw ##class(%Exception.General).%New("derived-store-foreign-role") }
            if $listlength(applications) throw ##class(%Exception.General).%New("derived-store-foreign-application")
            for i=1:1:$listlength(databases) { if $listget(databases,i)'=..Directory() throw ##class(%Exception.General).%New("derived-store-foreign-database") }
            if ..HasRows("SELECT Name FROM Security.Roles WHERE GrantedRoles LIKE '%"_..#RESOURCE_"%'")||..HasRows("SELECT Name FROM Security.Users WHERE Roles LIKE '%"_..#RESOURCE_"%'") throw ##class(%Exception.General).%New("derived-store-foreign-role-member")
        } elseif ##class(Config.Databases).Exists(..#STORE)||##class(%File).DirectoryExists(..Directory())||##class(Security.Resources).Exists(..#RESOURCE)||##class(Security.Roles).Exists(..#RESOURCE) {
            throw ##class(%Exception.General).%New("derived-store-partial-state")
        }
    } catch exception { set sc=exception.AsStatus() }
    zn original
    quit sc
}

/// IRIS creates an empty stream child. Never recursively delete files or directories.
ClassMethod RemoveEmptyDirectories() As %Status
{
    if ##class(%File).DirectoryExists(..Directory()_"stream/") {
        if '##class(%File).RemoveDirectory(..Directory()_"stream/") quit $$$ERROR($$$GeneralError,"Derived stream directory not empty or removable")
    }
    if '##class(%File).RemoveDirectory(..Directory()) quit $$$ERROR($$$GeneralError,"Derived directory not empty or removable")
    quit $$$OK
}

/// Physical database references bypass namespace mappings; metadata observation is bounded.
ClassMethod Fingerprint(pName As %String) As %String
{
    set root="^|""^^"_..Directory()_"""|"_pName,reference=root,count=0
    set value=$select($data(@root)#2:@root,1:"")
    // IRIS increments this dictionary generation counter during package/class inspection.
    // Definition children still contribute to the hash; foreign classes remain a conflict.
    if (pName="oddDEF"),(value?1.N) set value=""
    set hash=$SYSTEM.Encryption.SHAHash(256,value)
    for {
        set reference=$query(@reference)
        if (reference="")||($qsubscript(reference,0)'=pName) quit
        set count=count+1
        if (count>10000)||($length(@reference)>32768) throw ##class(%Exception.General).%New("derived-store-metadata-bound")
        set hash=$SYSTEM.Encryption.SHAHash(256,hash_$listbuild(reference,@reference))
    }
    quit hash
}

ClassMethod HasRows(pSQL As %String) As %Boolean [ Private ]
{
    set statement=##class(%SQL.Statement).%New(),sc=statement.%Prepare(pSQL)
    if $$$ISERR(sc) throw ##class(%Exception.StatusException).CreateFromStatus(sc)
    set result=statement.%Execute()
    if result.%SQLCODE<0 throw ##class(%Exception.General).%New("derived-store-metadata-query-failed")
    quit result.%Next()
}

/// Lazy IRIS metadata headers may appear after Configure. Permit only physically empty headers.
ClassMethod EmptyIRISHeader(pName As %String) As %Boolean [ Private ]
{
    set names="IRIS.Msg,IRIS.MsgNames,ISC.Src.Jrn,ROUTINE,oddCOM,oddDEF,oddDEP,oddEXT,oddEXTR,oddMAP,oddMETA,oddPKG,oddPROC,oddPROJECT,oddPYTHON,oddSQL,oddStudioDocument,oddStudioMenu,oddTSQL,oddXML,rBACKUP,rINC,rINCSAVE,rINDEX,rINDEXCLASS,rINDEXEXT,rINDEXSQL,rMAC,rMACSAVE,rMAP,rOBJ"
    if '$listfind($listfromstring(names),pName) quit 0
    set root="^|""^^"_..Directory()_"""|"_pName
    quit '$data(@root)
}
}
