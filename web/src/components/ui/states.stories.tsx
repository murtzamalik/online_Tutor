import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState, ErrorState, ForbiddenState, LoadingState, OfflineState } from "./states";

const meta: Meta = {
  title: "Shell-07/States",
};
export default meta;

export const Loading: StoryObj = { render: () => <LoadingState /> };
export const Empty: StoryObj = {
  render: () => <EmptyState title="No practice yet" body="Start a session from Home." />,
};
export const Error: StoryObj = {
  render: () => <ErrorState body="We could not reach the server." />,
};
export const Offline: StoryObj = { render: () => <OfflineState /> };
export const Forbidden: StoryObj = { render: () => <ForbiddenState /> };
