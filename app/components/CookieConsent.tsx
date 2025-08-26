import { Box, Button, Portal, ActionBar, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import useCookieConsentStore from '../store/cookieConsentStore';

interface CookieConsentProps {
  onConsent: (consent: boolean) => void;
}

const CookieConsent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { setConsentStatus } = useCookieConsentStore();

  useEffect(() => {
    const askedBefore = localStorage.getItem('analyticsConsentAsked');
    const savedConsent = localStorage.getItem('analyticsConsent');
    
    if (!askedBefore && savedConsent === null) {
      // Show ActionBar after a delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setIsOpen(false);
    setConsentStatus(true);
    localStorage.setItem('analyticsConsentAsked', 'true');
    localStorage.setItem('analyticsConsent', 'true');
  };

  const handleReject = () => {
    setIsOpen(false);
    setConsentStatus(false);
    localStorage.setItem('analyticsConsentAsked', 'true');
    localStorage.setItem('analyticsConsent', 'false');
  };

  return (
    <ActionBar.Root open={isOpen}>
      <Portal>
        <Box zIndex="1000" position="relative">
          <ActionBar.Positioner>
            <ActionBar.Content>
                <Text>
                  We use cookies to analyze traffic and improve your experience. 
                  Do you consent to the use of cookies for analytics?
                </Text>
                  <Button variant="outline" onClick={handleReject}>Reject</Button>
                <Button colorPalette="primary" onClick={handleAccept}>Accept</Button>
            </ActionBar.Content>
          </ActionBar.Positioner>
        </Box>
      </Portal>
    </ActionBar.Root>
  );
};

export default CookieConsent;
