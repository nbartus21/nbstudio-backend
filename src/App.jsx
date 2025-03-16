import InvoiceManager from './components/InvoiceManager';
import DocumentManager from './components/DocumentManager';
import RecurringInvoiceManager from './components/RecurringInvoiceManager';

// A projekt részletes oldalának útvonalainak frissítése, hogy tartalmazzon egy új útvonalat az ismétlődő számlákhoz
<Route path="/projects/:projectId" element={<ProjectDetails />}>
  <Route index element={<ProjectOverview />} />
  <Route path="tasks" element={<TaskManager />} />
  <Route path="invoices" element={<InvoiceManager />} />
  <Route path="recurring-invoices" element={<RecurringInvoiceManager />} />
  <Route path="documents" element={<DocumentManager />} />
  <Route path="chat" element={<ChatInterface />} />
  <Route path="settings" element={<ProjectSettings />} />
</Route> 