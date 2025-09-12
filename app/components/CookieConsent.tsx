"use client";

import { Box, Button, Portal, ActionBar, Text, Link } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import useCookieConsentStore from '../store/cookieConsentStore';

const CookieConsent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { setConsentStatus } = useCookieConsentStore();

  useEffect(() => {
    const consentAsked = localStorage.getItem('analyticsConsentAsked');
    if (!consentAsked) {
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
            <ActionBar.Content padding="1rem 1rem" display="flex" flexDirection={{ base: 'column', md: 'row' }} alignItems="center" justifyContent="left" gap={4}>
              <Text>
                We use cookies to analyze traffic and improve your experience.
                <br/>
                Do you consent to the use of analytics cookies?
              </Text>
              <Box display="flex" gap={4} flexShrink={0}>
                <Button variant="outline" onClick={handleReject}>Decline</Button>
                <Button colorPalette="primary" onClick={handleAccept}>Accept all</Button>
                <Link href="https://www.wri.org/about/privacy-policy" target="_blank" rel="noopener noreferrer" _hover={{ textDecoration: 'none' }}>
                  <Button variant="solid">Privacy Policy</Button>
                </Link>
              </Box>
            </ActionBar.Content>
          </ActionBar.Positioner>
        </Box>
      </Portal>
    </ActionBar.Root>
  );
};

export default CookieConsent;
