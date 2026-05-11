# Job Reply Agent Resume Bank

This package contains approved resume assets for the Gmail Job Reply Agent.

## Where we are now

The app has resume routing logic, but the actual PDF resume assets were missing. This package fills that gap with approved lane-specific resumes and a resume map.

## Files to copy

Copy PDF files from:

```text
resumes/*.pdf
```

into:

```text
APPS/job-reply-agent/resumes/
```

Copy editable DOCX files from:

```text
resumes/source/*.docx
```

into:

```text
APPS/job-reply-agent/resumes/source/
```

Copy the mapping file:

```text
config/resume_map.yaml
```

into:

```text
APPS/job-reply-agent/config/resume_map.yaml
```

## Resume lanes

| File | Best for |
|---|---|
| Fejiro_Enterprise_Systems.pdf | Broad systems analyst, enterprise systems, IT systems, digital transformation roles |
| Fejiro_TPM_Systems.pdf | Technical Program Manager, delivery lead, program/project management roles |
| Fejiro_Business_Analyst.pdf | BA, BSA, technical BA, requirements, UAT, process analysis roles |
| Fejiro_Mobile_App_BA.pdf | Mobile app BA, product BA, ecommerce, loyalty, iOS/Android workflow roles |
| Fejiro_ERP_WMS_POS.pdf | ERP, WMS, POS, supply chain systems, warehouse, inventory roles |
| Fejiro_AI_Workflow.pdf | AI workflow, product strategy, automation, secure workflow, LLM tooling roles |
| Fejiro_Salesforce_TPM.pdf | Salesforce-adjacent TPM, CRM, enterprise application delivery roles |

## Safety note

The agent should select these approved resumes only. It should not rewrite resumes automatically. Use Gmail drafts first, then manual review and approval labels before sending.
