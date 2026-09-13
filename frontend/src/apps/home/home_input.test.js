import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import HomeInput from './home_input';

const PASSWORD = 'gCaV@2026';

beforeAll(() => {
  // jsdom has no matchMedia; make "(pointer: fine)" match so the desktop DatePicker renders
  window.matchMedia = (query) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

function renderHomeInput(initialDate = dayjs()) {
  const setDate = jest.fn();
  render(
    <HomeInput
      date={initialDate.format('YYYY-MM-DD')}
      setDate={setDate}
      allProducts={[]}
      selectedProduct={undefined}
      setSelectedProduct={jest.fn()}
    />
  );
  // HomeInput calls setDate(today) once on mount - ignore that call
  setDate.mockClear();
  return { setDate };
}

// Opens the calendar popup and clicks the given dayjs date (navigating months if needed)
async function pickDate(target) {
  userEvent.click(screen.getByRole('button', { name: /choose date/i }));
  await screen.findByRole('grid');

  const monthDiff = target.startOf('month').diff(dayjs().startOf('month'), 'month');
  for (let i = 0; i < Math.abs(monthDiff); i++) {
    userEvent.click(screen.getByRole('button', { name: monthDiff < 0 ? /previous month/i : /next month/i }));
  }
  // Wait for the month slide animation to settle on the target month before clicking a day
  const dayButton = await screen.findByRole('gridcell', { name: String(target.date()) });
  await waitFor(() => expect(dayButton).toBeVisible());
  userEvent.click(dayButton);
}

const yesterday = dayjs().subtract(1, 'day');
const tomorrow = dayjs().add(1, 'day');

test('picking a past date asks for a password instead of applying the date', async () => {
  const { setDate } = renderHomeInput();

  await pickDate(yesterday);

  expect(await screen.findByText('Past Date Locked')).toBeInTheDocument();
  expect(screen.getByText(new RegExp(yesterday.format('DD MMM YYYY')))).toBeInTheDocument();
  expect(setDate).not.toHaveBeenCalled();
});

test('wrong password shows an error and keeps the date locked', async () => {
  const { setDate } = renderHomeInput();

  await pickDate(yesterday);
  await screen.findByText('Past Date Locked');

  userEvent.type(screen.getByLabelText(/enter password/i), 'wrong-password');
  userEvent.click(screen.getByRole('button', { name: /unlock/i }));

  expect(await screen.findByText('Incorrect password')).toBeInTheDocument();
  expect(screen.getByText('Past Date Locked')).toBeInTheDocument();
  expect(setDate).not.toHaveBeenCalled();
});

test('correct password applies the past date and closes the dialog', async () => {
  const { setDate } = renderHomeInput();

  await pickDate(yesterday);
  await screen.findByText('Past Date Locked');

  userEvent.type(screen.getByLabelText(/enter password/i), PASSWORD);
  userEvent.click(screen.getByRole('button', { name: /unlock/i }));

  await waitFor(() => expect(setDate).toHaveBeenCalledWith(yesterday.format('YYYY-MM-DD')));
  await waitFor(() => expect(screen.queryByText('Past Date Locked')).not.toBeInTheDocument());
});

test('submitting the password with Enter also unlocks the date', async () => {
  const { setDate } = renderHomeInput();

  await pickDate(yesterday);
  await screen.findByText('Past Date Locked');

  userEvent.type(screen.getByLabelText(/enter password/i), `${PASSWORD}{enter}`);

  await waitFor(() => expect(setDate).toHaveBeenCalledWith(yesterday.format('YYYY-MM-DD')));
});

test('cancel closes the dialog without changing the date', async () => {
  const { setDate } = renderHomeInput();

  await pickDate(yesterday);
  await screen.findByText('Past Date Locked');

  userEvent.click(screen.getByRole('button', { name: /cancel/i }));

  await waitFor(() => expect(screen.queryByText('Past Date Locked')).not.toBeInTheDocument());
  expect(setDate).not.toHaveBeenCalled();
});

test('future dates are applied directly without a password', async () => {
  const { setDate } = renderHomeInput();

  await pickDate(tomorrow);

  await waitFor(() => expect(setDate).toHaveBeenCalledWith(tomorrow.format('YYYY-MM-DD')));
  expect(screen.queryByText('Past Date Locked')).not.toBeInTheDocument();
});

test('today is applied directly without a password', async () => {
  // Start on an (already unlocked) past date so that picking today is an actual change
  const { setDate } = renderHomeInput(yesterday);

  await pickDate(dayjs());

  await waitFor(() => expect(setDate).toHaveBeenCalledWith(dayjs().format('YYYY-MM-DD')));
  expect(screen.queryByText('Past Date Locked')).not.toBeInTheDocument();
});
