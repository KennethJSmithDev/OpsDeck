/// Read-only reconstruction of untrusted intent under current caller and fixed profile policy.
Class OpsDeck.Product.IntentRehearsal Extends %CSP.REST
{
ClassMethod ProfileIds() As %String [ Private ]
{
    quit $listbuild("AI_PROFILE_USER","AI_PROFILE_SUPPORT","AI_PROFILE_ADMIN","AI_PROFILE_DBA","AI_PROFILE_SECURITY","AI_PROFILE_PACKAGE_OPERATOR","AI_PROFILE_AUDITOR")
}

ClassMethod ProfileAllows(profile As %String, operation As %String) As %Boolean [ Private ]
{
    if '$listfind(..ProfileIds(),profile) quit 0
    if operation="webapp.observe" quit 1
    quit ((profile="AI_PROFILE_ADMIN")||(profile="AI_PROFILE_SECURITY"))&&((operation="webapp.enable")||(operation="webapp.disable"))
}

ClassMethod HumanAllows() As %Boolean [ Private ]
{
    quit ($namespace="%SYS")&&$SYSTEM.Security.Check("%Admin_Secure","USE")
}

ClassMethod Envelope() As %DynamicObject [ Private ]
{
    set result=##class(%DynamicObject).%New(),result.provider="opsdeck-intent-rehearsal-v1",result.username=$username,result.namespace=$namespace
    set result.state="UNAVAILABLE",result.dispatchAllowed=0,result.trust="server-reconstructed-current-iris-state"
    quit result
}

ClassMethod Profiles() As %Status
{
    set %response.ContentType="application/json; charset=utf-8",result=..Envelope(),result.state="OBSERVED"
    set result.profiles=##class(%DynamicArray).%New(),ids=..ProfileIds(),human=..HumanAllows()
    for index=1:1:$listlength(ids) {
        set profile=$listget(ids,index),row=##class(%DynamicObject).%New(),row.id=profile
        set row.operationIds=##class(%DynamicArray).%New(),row.effectiveOperationIds=##class(%DynamicArray).%New()
        for operation="webapp.observe","webapp.enable","webapp.disable" {
            if ..ProfileAllows(profile,operation) {
                do row.operationIds.%Push(operation)
                if human do row.effectiveOperationIds.%Push(operation)
            }
        }
        do result.profiles.%Push(row)
    }
    write result.%ToJSON()
    quit $$$OK
}

ClassMethod Rehearse() As %Status
{
    set %response.ContentType="application/json; charset=utf-8",result=..Envelope()
    try {
        if %request.Content.Size>4096 throw ##class(%Exception.General).%New("invalid-input")
        set input=##class(%DynamicObject).%FromJSON(%request.Content)
        if (input.%Size()'=2)||(input.%GetTypeOf("profileId")'="string")||(input.%GetTypeOf("candidate")'="object") throw ##class(%Exception.General).%New("invalid-input")
        set iterator=input.%GetIterator()
        while iterator.%GetNext(.key,.value) {
            if '$listfind($listbuild("profileId","candidate"),key) throw ##class(%Exception.General).%New("invalid-input")
        }
        set candidate=input.candidate
        if (candidate.%Size()'=2)||(candidate.%GetTypeOf("operationId")'="string")||(candidate.%GetTypeOf("targetKey")'="string") throw ##class(%Exception.General).%New("invalid-input")
        set iterator=candidate.%GetIterator()
        while iterator.%GetNext(.key,.value) {
            if '$listfind($listbuild("operationId","targetKey"),key) throw ##class(%Exception.General).%New("invalid-input")
        }
        set operation=candidate.operationId,name=candidate.targetKey,profile=input.profileId
        if '$listfind(..ProfileIds(),profile) throw ##class(%Exception.General).%New("invalid-input")
        if '$listfind($listbuild("webapp.observe","webapp.enable","webapp.disable"),operation) throw ##class(%Exception.General).%New("invalid-input")
        if ($length(name)>256)||($extract(name,1)'="/")||($length(name)<2)||($translate(name,"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.%/-","")'="") throw ##class(%Exception.General).%New("invalid-input")
        set result.profileId=profile
        if '..ProfileAllows(profile,operation) {
            set %response.Status=403,result.state="DENIED",result.reason="ai-profile-operation-denied"
        } elseif '..HumanAllows() {
            set %response.Status=403,result.state="DENIED",result.reason="current-human-authority-denied"
        } else {
            set sc=##class(Security.Applications).Get(name,.properties)
            if $$$ISERR(sc) {
                set %response.Status=404,result.state="ABSENT",result.reason="authoritative-application-unavailable"
            } elseif ('$data(properties("Enabled")))||('$data(properties("NameSpace")))||((properties("Enabled")'=0)&&(properties("Enabled")'=1)) {
                set result.state="UNVERIFIED",result.reason="authoritative-prestate-unresolved"
            } else {
                set observedAt=$translate($zdatetime($ztimestamp,3)," ","T")_"Z"
                set target=##class(%DynamicObject).%New(),target.domain="applications",target.kind="web-app",target.provider="iris-admin-api"
                set target.key=name,target.label=name,target.scope=properties("NameSpace"),target.observedAt=observedAt
                set targetRef=##class(%DynamicObject).%New(),targetRef.id="local",targetRef.label="LOCAL",targetRef.origin="same-origin",targetRef.environment="LOCAL"
                set result.target=target,result.targetRef=targetRef,result.observedAt=observedAt
                set preState=##class(%DynamicObject).%New()
                do preState.%Set("enabled",properties("Enabled")=1,"boolean")
                if operation="webapp.observe" {
                    set result.state="OBSERVED",result.value=preState
                } else {
                    set plan=##class(%DynamicObject).%New(),plan.id="intent:"_$job_":"_$piece($horolog,",",1)_":"_$translate($piece($ztimestamp,",",2),".","_")
                    set plan.intent="AI rehearsal "_$select(operation="webapp.enable":"enable",1:"disable")_" "_name
                    set plan.target=target,plan.targetRef=targetRef,plan.preState=preState,plan.createdAt=observedAt,plan.ttlSeconds=120
                    set capability=##class(%DynamicObject).%New(),capability.id=operation,capability.state="SUPPORTED",capability.risk="MEDIUM"
                    set capability.semanticAction=$select(operation="webapp.enable":"enable",1:"disable"),capability.providerOperation="PUT /api/admin/v2/web-app"
                    set capability.requiredPrivileges=##class(%DynamicArray).%New()
                    do capability.requiredPrivileges.%Push("%Admin_Secure:U")
                    set plan.capability=capability,parameters=##class(%DynamicObject).%New()
                    do parameters.%Set("enabled",operation="webapp.enable","boolean")
                    set plan.parameters=parameters,plan.preStateEvidence="iris-native-intent:authoritative-application"
                    set authority=##class(%DynamicObject).%New(),authority.state="SUPPORTED",authority.evidence="iris-native-intent:"_profile_":secure-use"
                    set plan.authorityValidation=authority,plan.expectedReadback="Enabled is "_$select(operation="webapp.enable":"true",1:"false")
                    set plan.preconditions=##class(%DynamicArray).%New(),condition=##class(%DynamicObject).%New()
                    set condition.claim="Current human authority intersects server-owned AI profile and operation policy",condition.evidence=authority.evidence
                    do condition.%Set("observed",1,"boolean")
                    do plan.preconditions.%Push(condition)
                    set result.planInput=plan,result.state="REVIEW_REQUIRED"
                }
            }
        }
    } catch exception {
        set %response.Status=400,result.state="FAILED",result.reason="candidate-shape-or-policy-rejected"
    }
    write result.%ToJSON()
    quit $$$OK
}
}
