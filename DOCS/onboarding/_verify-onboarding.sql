select 'project' as kind, intake_id, name, status, billing, tier
from projects
where intake_id in ('gardencleaners-2026-04','ogtradesacademy-2026-04')
order by intake_id;

select 'milestone' as kind, p.intake_id, m.title, m.status
from milestones m
join projects p on p.id = m.project_id
where p.intake_id in ('gardencleaners-2026-04','ogtradesacademy-2026-04')
order by p.intake_id, m.title;

select 'invoice' as kind, p.intake_id, i.invoice_number, i.amount_cad, i.status, i.payment_method, i.payment_reference
from invoices i
join projects p on p.id = i.project_id
where p.intake_id in ('gardencleaners-2026-04','ogtradesacademy-2026-04');

select 'payment' as kind, p.intake_id, pr.amount_cad, pr.method, pr.reference, pr.received_at
from payment_records pr
join projects p on p.id = pr.project_id
where p.intake_id in ('gardencleaners-2026-04','ogtradesacademy-2026-04');
