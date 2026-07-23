# FTC Analytics Standard

Status: PROPOSED  
Last updated: 2026-07-23

## Rule

Analytics must answer product questions without capturing sensitive payloads.

## Required event fields

event_name, product, timestamp, anonymous/user/household identifier as appropriate, surface, feature_flag, consent_state, client_version, platform, and non-sensitive outcome.

## Prohibited data

Message bodies, documents, allegations, children's names, addresses, phone numbers, medical details, credentials, payment-card data, and private court material.

