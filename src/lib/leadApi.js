import { base44 } from '@/api/base44Client';
import { usePortal } from '@/lib/PortalContext';

// Routes lead operations to the owner's direct SDK calls or, for access-code
// customers, to the token-validated customer_lead_ops backend function — so
// the Leads UI is identical for both while the customer never needs a
// platform account.
export function useLeadApi() {
  const { mode, token } = usePortal();
  const isCustomer = mode === 'customer';

  const call = async (op, payload) => {
    const res = await base44.functions.invoke('customer_lead_ops', { token, op, payload });
    return res.data || res;
  };

  return {
    isCustomer,
    updateLead: (id, fields) =>
      isCustomer ? call('update', { id, fields }) : base44.entities.Lead.update(id, fields),
    bulkStatus: (ids, status) =>
      isCustomer
        ? call('bulk_status', { ids, status })
        : Promise.all(ids.map((id) => base44.entities.Lead.update(id, { status }))),
    deleteLead: (id) => (isCustomer ? call('delete', { id }) : base44.entities.Lead.delete(id)),
    searchLeads: (message, filters, count) =>
      isCustomer
        ? call('search', { message, filters, count })
        : base44.functions.invoke('lead_discovery', { message, filters, count }).then((r) => r.data || r),
    getActivities: async (leadId) =>
      isCustomer
        ? (await call('activities', { id: leadId })).rows || []
        : base44.entities.Activity.filter({ related_type: 'Lead', related_id: leadId }, '-created_date', 20),
  };
}