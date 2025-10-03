
import { toggleFollow as toggleFollowAction } from '@/app/actions/user-actions';
import { ConnectionsPageClient } from './ConnectionsPageClient';

// This is the new SERVER component for the Connections Page.
export default function ConnectionsPage() {
  // This component now safely handles importing the server action.
  // It then passes the action as a prop to the client component.
  return (
    <ConnectionsPageClient
      toggleFollowAction={toggleFollowAction}
    />
  );
}
