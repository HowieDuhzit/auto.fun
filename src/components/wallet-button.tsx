import { WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { useWalletModal } from "../hooks/use-wallet-modal";
import Button from "./button";
import { shortenAddress } from "@/utils";
import { ChevronDown, Copy, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router";
import { useUser } from "@/contexts/user";

const WalletButton = () => {
  const navigate = useNavigate();
  const {
    publicKey,
    connecting,
    connected,
    signIn,
    wallet,
    select,
    connect,
    disconnect,
  } = useWallet();
  const { logOut, authenticated } = useUser();
  const { setVisible, hasStoredWallet, isAuthenticated, authenticate } =
    useWalletModal();
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add state to track authentication attempts
  const [authAttempted, setAuthAttempted] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const authTimeoutRef = useRef<number | null>(null);

  // Handle clicks outside of dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Attempt to auto-connect on initial render if we have a stored wallet
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (hasStoredWallet && !connected && !connecting) {
        const lastWalletName = localStorage.getItem("lastWalletName");
        if (lastWalletName) {
          try {
            console.log("attemptAutoConnect", lastWalletName);
            setIsAutoConnecting(true);
            if (signIn) {
              await signIn();
            } else {
              console.log("signIn doesn't exist", signIn);
              await select(lastWalletName as WalletName);
            }
            if (!signIn) {
              await connect();
            }
            console.log("Auto-connected to wallet:", lastWalletName);
          } catch (error) {
            console.error("Failed to auto-connect:", error);
            // Clear stored wallet data on failed connect
            localStorage.removeItem("walletConnected");
            localStorage.removeItem("lastWalletName");
          } finally {
            setIsAutoConnecting(false);
          }
        }
      }
    };

    attemptAutoConnect();
  }, [hasStoredWallet, connected, connecting, select, connect]);

  // Attempt to authenticate
  const attemptAuthentication = async () => {
    if (
      !publicKey ||
      !window.solana ||
      typeof window.solana.signMessage !== "function"
    ) {
      console.error("Cannot authenticate: wallet not properly connected");
      return;
    }

    // Don't attempt if we've already failed authentication recently
    if (authFailed) {
      console.log("Skipping authentication as it recently failed");
      return;
    }

    // Check if we're already authenticated - if so, don't try again
    if (isAuthenticated || localStorage.getItem("localAuth") === "true") {
      console.log("Already authenticated locally, skipping authentication");
      return;
    }

    try {
      console.log("Attempting authentication with wallet", {
        publicKey: publicKey.toString(),
        walletName: wallet?.adapter.name,
        authenticatedState: authenticated
      });
      
      // No need to create SIWS message anymore, the authenticate method will handle it
      await authenticate({} as any, "");
      
      console.log("Authentication successful");
      setAuthFailed(false);
      
      // Set a local marker to prevent unnecessary disconnections
      localStorage.setItem("localAuth", "true");
    } catch (error) {
      console.error("Authentication failed:", error);
      
      // Even if authentication with backend fails, still allow local app usage
      console.log("Setting up local-only authentication");
      const tempToken = `temp_${publicKey?.toString()}_${Date.now()}`;
      localStorage.setItem("authToken", tempToken);
      localStorage.setItem("localAuth", "true");
      
      setAuthFailed(true); // Mark auth as failed to prevent loops

      // Reset after a timeout to allow retry later
      setTimeout(() => {
        setAuthFailed(false);
      }, 30000); // Don't retry for 30 seconds
    } finally {
      setAuthAttempted(true);
    }
  };

  // Early connection tracking with localStorage
  useEffect(() => {
    // When wallet connects, track it immediately in localStorage to prevent double auth attempts
    if (connected && publicKey) {
      // Save connection status immediately
      localStorage.setItem("walletConnected", "true");
      
      if (wallet) {
        localStorage.setItem("lastWalletName", wallet.adapter.name);
      }
      
      // Check if we should set local auth
      if (!localStorage.getItem("localAuth") && !authAttempted && !isAuthenticated) {
        // Delay by a small amount to wait for any pending auth to complete
        const timeoutId = setTimeout(() => {
          if (!localStorage.getItem("localAuth") && connected && publicKey) {
            console.log("Setting initial local auth marker");
            localStorage.setItem("localAuth", "true");
          }
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [connected, publicKey, wallet, authAttempted, isAuthenticated]);

  // Single authentication attempt after connection is established
  useEffect(() => {
    // Check if there's already a local auth marker - if so, don't attempt auth again
    if (localStorage.getItem("localAuth") === "true") {
      console.log("Local auth marker found, skipping authentication");
      setAuthAttempted(true);
      return;
    }
    
    // Only attempt auth if connected, not authenticated, not already attempted, and not failed
    if (
      connected &&
      publicKey &&
      !isAuthenticated &&
      !authAttempted &&
      !authFailed
    ) {
      // Add a delay to allow wallet connection to stabilize
      const delayedAuth = setTimeout(() => {
        if (authTimeoutRef.current) {
          window.clearTimeout(authTimeoutRef.current);
        }

        // Set a small delay to avoid multiple attempts
        authTimeoutRef.current = window.setTimeout(() => {
          // Double check that wallet is still connected before attempting authentication
          if (connected && publicKey && !localStorage.getItem("localAuth")) {
            console.log("Proceeding with delayed authentication attempt");
            attemptAuthentication();
          }
        }, 500);
      }, 1000); // Wait 1 second after connection before attempting auth

      return () => clearTimeout(delayedAuth);
    }

    // Reset auth attempted state when disconnected
    if (!connected) {
      setAuthAttempted(false);
      setAuthFailed(false);
    }

    return () => {
      if (authTimeoutRef.current) {
        window.clearTimeout(authTimeoutRef.current);
      }
    };
  }, [connected, publicKey, isAuthenticated, authAttempted, authFailed]);

  // Handle button click - show dropdown if connected, open modal otherwise
  const handleClick = async () => {
    if (!connected) {
      if (!connecting && !isAutoConnecting) {
        console.log("Opening wallet modal");
        setVisible(true);
      }
    } else {
      setMenuOpen(!menuOpen);
    }
  };

  // Clean up auth state when disconnected
  useEffect(() => {
    if (!connected && !connecting) {
      // When wallet is disconnected, clear all auth markers
      if (localStorage.getItem("localAuth") === "true") {
        console.log("Wallet disconnected, cleaning up local auth state");
        localStorage.removeItem("localAuth");
      }
    }
  }, [connected, connecting]);

  // Handle disconnect - update to use both user and wallet logout
  const handleDisconnect = async () => {
    try {
      console.log("Disconnecting wallet...");
      
      // Clear auth markers before logout
      localStorage.removeItem("localAuth");
      localStorage.removeItem("lastAuthAttempt");

      // Use the centralized logOut function to handle all cleanup first
      // This will also call wallet logout
      logOut();

      // Only try to disconnect if we're connected and have a wallet
      if (connected && wallet) {
        try {
          await disconnect();
        } catch (e) {
          console.error("Error during disconnect:", e);
        }
      }

      // Force a manual reset of local state to ensure UI updates correctly
      setAuthAttempted(false);
      setAuthFailed(false);
      setMenuOpen(false);

      // Force a reload to ensure clean wallet state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  // Handle copy wallet address
  const handleCopyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  // Handle navigation to profile
  const handleViewProfile = () => {
    navigate("/profile");
    setMenuOpen(false);
  };

  // Handle manual authentication if needed
  const handleAuthenticate = () => {
    if (!isAuthenticated && !authFailed) {
      setAuthAttempted(false); // Reset to allow a new attempt
      attemptAuthentication();
    }
  };

  // Simple button text
  const buttonText =
    connecting || isAutoConnecting
      ? "Connecting..."
      : connected
        ? "Disconnect Wallet"
        : "Connect Wallet";

  // Log wallet state for debugging
  useEffect(() => {
    console.log("Wallet state:", {
      connected,
      connecting,
      wallet: wallet?.adapter.name,
      publicKey: publicKey?.toString(),
      isAuthenticated,
      authAttempted,
      authFailed,
    });
  }, [
    connected,
    connecting,
    wallet,
    publicKey,
    isAuthenticated,
    authAttempted,
    authFailed,
  ]);

  // Extra effect to force clean up wallet connection when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any pending auth timeouts
      if (authTimeoutRef.current) {
        window.clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  if (connected && wallet) {
    return (
      <div className="relative" ref={dropdownRef}>
        <Button size="large" className="px-2" onClick={handleClick}>
          <div className="flex items-center gap-2.5 justify-between m-auto">
            <span className="font-satoshi font-medium">
              {wallet?.adapter?.publicKey?.toString()
                ? shortenAddress(wallet?.adapter?.publicKey?.toString())
                : null}
            </span>

            {wallet.adapter.icon ? (
              <img
                src={wallet?.adapter?.icon}
                height={18}
                width={18}
                alt={`wallet_icon_${wallet?.adapter?.name}`}
              />
            ) : null}
            <ChevronDown className="size-5 text-autofun-icon-secondary" />
          </div>
        </Button>

        {menuOpen && (
          <div className="absolute z-50 right-0 mt-2 bg-[#171717] border border-[#262626] shadow-lg overflow-hidden w-48">
            <ul className="py-2">
              <li
                className="px-4 py-2 text-sm text-white hover:bg-[#262626] cursor-pointer flex items-center gap-2"
                onClick={handleCopyAddress}
              >
                <Copy size={16} />
                {copied ? "Copied!" : "Copy Address"}
              </li>
              <li
                className="px-4 py-2 text-sm text-white hover:bg-[#262626] cursor-pointer flex items-center gap-2"
                onClick={handleViewProfile}
              >
                <User size={16} />
                Profile
              </li>
              {!isAuthenticated && (
                <li
                  className="px-4 py-2 text-sm text-white hover:bg-[#262626] cursor-pointer flex items-center gap-2"
                  onClick={handleAuthenticate}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 8V16M8 12H16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Authenticate
                </li>
              )}
              <li
                className="px-4 py-2 text-sm text-white hover:bg-[#262626] cursor-pointer flex items-center gap-2"
                onClick={handleDisconnect}
              >
                <LogOut size={16} />
                Disconnect
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      size="large"
      onClick={handleClick}
      disabled={connecting || isAutoConnecting}
    >
      {buttonText}
    </Button>
  );
};

export default WalletButton;

