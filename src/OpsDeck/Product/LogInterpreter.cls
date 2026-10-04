Class OpsDeck.Product.LogInterpreter Extends %RegisteredObject
{

/// Compact transparent concept vectors, not a neural embedding model. No rich log text is retained.
ClassMethod ConceptVector(text As %String) As %String [ Language = python ]
{
    import json
    import re
    concepts = (
        ("timeout", r"time[ -]?out|timed out|latency|slow"),
        ("denied", r"denied|forbidden|unauthori[sz]ed|permission|privilege"),
        ("error", r"error|fatal|severe|failed|failure"),
        ("warning", r"warning|warn"),
        ("retry", r"retry|retries|retrying"),
        ("network", r"network|http|connection|socket|gateway"),
        ("database", r"database|global|storage|journal|disk"),
        ("namespace", r"namespace|mapping"),
        ("package", r"package|ipm|zpm|module|install"),
        ("task", r"task|schedule|job|async"),
        ("application", r"application|web app|dispatch|route"),
        ("authentication", r"authenticat|login|password|credential"),
        ("memory", r"memory|heap|allocation"),
        ("cpu", r"cpu|processor|compute"),
        ("restart", r"restart|startup|shutdown|starting|stopped"),
        ("security", r"security|audit|role|resource"),
    )
    selected = [bool(re.search(pattern, text[:2048], re.IGNORECASE)) for _, pattern in concepts]
    return json.dumps({"model": "opsdeck-concepts-v1", "text": " ".join(name for (name, _), yes in zip(concepts, selected) if yes), "vector": ",".join("1" if yes else "0" for yes in selected)}, separators=(",", ":"))
}

/// Classify one bounded fixed-log projection with Embedded Python.
/// No filesystem, network, process, or persistent-data access is performed here.
ClassMethod Analyze(sourceId As %String, logPayload As %String) As %String [ Language = python ]
{
    import json
    import re

    sourceNames = {"messagesLog": "messages.log", "systemMonitorLog": "SystemMonitor.log"}
    source = sourceNames.get(sourceId, "messages.log rotation" if re.fullmatch(r"messagesRotation:[0-9A-F]{64}", sourceId or "") else "unknown")
    result = {
        "provider": "opsdeck-embedded-python-log-analysis-v1",
        "sourceId": sourceId if source != "unknown" else "unknown",
        "source": source,
        "status": "failed",
        "lineCount": 0,
        "findingCount": 0,
        "truncated": False,
        "findingsTruncated": False,
        "findings": [],
    }

    try:
        payload = json.loads(logPayload)
    except (TypeError, ValueError):
        result["reason"] = "invalid-log-projection"
        return json.dumps(result, separators=(",", ":"))

    if source == "unknown" or not isinstance(payload, dict):
        result["reason"] = "invalid-log-projection"
        return json.dumps(result, separators=(",", ":"))

    status = payload.get("status")
    lines = payload.get("lines")
    if status not in ("available", "empty", "truncated") or not isinstance(lines, list):
        result["reason"] = "invalid-log-projection"
        return json.dumps(result, separators=(",", ":"))
    if len(lines) > 250 or any(not isinstance(line, str) or len(line) > 2048 for line in lines):
        result["reason"] = "invalid-log-projection"
        return json.dumps(result, separators=(",", ":"))

    patterns = [
        ("explicit-error-marker", re.compile(r"\b(?:error|fatal|severe)\b", re.IGNORECASE)),
        ("timeout-marker", re.compile(r"\btime[ -]?out\b|\btimed out\b", re.IGNORECASE)),
        ("access-denial-marker", re.compile(r"\b(?:denied|forbidden|unauthorized)\b", re.IGNORECASE)),
        ("retry-marker", re.compile(r"\bretries\b|\bretry(?:ing)?\b", re.IGNORECASE)),
        ("warning-marker", re.compile(r"\bwarning\b|\bwarn\b", re.IGNORECASE)),
    ]

    findings = []
    matchingLineCount = 0
    for lineNumber, line in enumerate(lines, start=1):
        for ruleId, pattern in patterns:
            match = pattern.search(line)
            if match:
                matchingLineCount += 1
                if len(findings) < 20:
                    findings.append({
                        "id": "log:%s:line-%s:%s" % (sourceId, lineNumber, ruleId),
                        "lineNumber": lineNumber,
                        "ruleId": ruleId,
                        "marker": match.group(0)[:48],
                    })
                break

    result["status"] = status
    result["lineCount"] = len(lines)
    result["findingCount"] = len(findings)
    result["truncated"] = payload.get("truncated") is True or status == "truncated"
    result["findingsTruncated"] = matchingLineCount > len(findings)
    result["findings"] = findings
    return json.dumps(result, separators=(",", ":"))
}
}
