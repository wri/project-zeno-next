import { Box, Button, Portal, ActionBar, Text, Link } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import useCookieConsentStore from '../store/cookieConsentStore';

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
                  Do you consent?
                  <br />
                  See our{' '}
                  <Link href="https://www.wri.org/about/privacy-policy" target="_blank" rel="noreferrer" color="blue.500">
                    Privacy Policy
                  </Link>
                  {' '}for more info.
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
