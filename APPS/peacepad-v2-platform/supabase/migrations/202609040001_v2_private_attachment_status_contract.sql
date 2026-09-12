-- Keep the private attachment table's internal lifecycle separate from the
-- native API contract. The database uses active/archived; clients receive
-- available/archived, matching conversation attachments and v2.ts.
create or replace function peacepad_v2.private_attachment_json(row_value peacepad_v2.private_attachment)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
  select jsonb_build_object(
    'id',row_value.attachment_id,'familyCircleId',row_value.family_id,
    'ownerIdentityId',row_value.owner_identity_id,
    'target',jsonb_build_object('kind','private-binder','binderId',row_value.case_binder_id),
    'originalFileName',row_value.original_file_name,'mediaType',row_value.media_type,
    'byteLength',row_value.byte_length,
    'status',case row_value.status
      when 'active' then 'available'
      when 'archived' then 'archived'
      else null
    end,
    'schemaVersion','2.0','version',row_value.version,'region',row_value.region,
    'provenance',jsonb_build_object('createdAt',row_value.created_at,
      'createdBy',jsonb_build_object('identityId',row_value.owner_identity_id,
        'sessionId',row_value.owner_identity_id),'source','app'));
$$;

revoke all on function peacepad_v2.private_attachment_json(peacepad_v2.private_attachment) from public,anon,authenticated;
