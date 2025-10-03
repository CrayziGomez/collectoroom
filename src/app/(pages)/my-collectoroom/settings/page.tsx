
import { updateAvatar as updateAvatarAction } from '@/app/actions/user-actions';
import { SettingsPageClient } from './SettingsPageClient';

// This is the new SERVER component for the Settings Page.
export default function SettingsPage() {
  // This component now safely handles importing the server action.
  // It then passes the action as a prop to the client component.
  return (
    <SettingsPageClient
      updateAvatarAction={updateAvatarAction}
    />
  );
}
