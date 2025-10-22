import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../components/Auth/LoginForm';
import { AuthProvider } from '../context/AuthContext';

const mockLogin = jest.fn();

jest.mock('../hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({ login: mockLogin }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    // Clear mock history before each test
    mockLogin.mockClear();
    render(<AuthProvider><LoginForm /></AuthProvider>);
  });

  it('renders input fields and a submit button', () => {
    expect(screen.getByPlaceholderText('email_address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'sign_in' })).toBeInTheDocument();
  });

  it('calls the login function with credentials on form submission', async () => {
    const emailInput = screen.getByPlaceholderText('email_address');
    const passwordInput = screen.getByPlaceholderText('password');
    const submitButton = screen.getByRole('button', { name: 'sign_in' });

    // Simulate user typing
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Simulate form submission
    fireEvent.click(submitButton);

    // Wait for the login function to be called
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
