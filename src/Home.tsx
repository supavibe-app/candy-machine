import { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';

import styled from 'styled-components';
import { Container, Grid, Snackbar, Box } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';
import { PublicKey } from '@solana/web3.js';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';
import {
  awaitTransactionSignatureConfirmation,
  CandyMachineAccount,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from './candy-machine';
import { AlertState } from './utils';
import { Header } from './Header';
import { MintButton } from './MintButton';
import { GatewayProvider } from '@civic/solana-gateway-react';

const ConnectButton = styled(WalletDialogButton)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const MintContainer = styled.div``; // add your owns styles here

export interface HomeProps {
  candyMachineId?: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  txTimeout: number;
  rpcHost: string;
}

const Home = (props: HomeProps) => {
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const refreshCandyMachineState = useCallback(async () => {
    if (!anchorWallet) {
      return;
    }

    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection,
        );
        setCandyMachine(cndy);
      } catch (e) {
        console.log('There was a problem fetching Candy Machine state');
        console.log(e);
      }
    }
  }, [anchorWallet, props.candyMachineId, props.connection]);

  const onMint = async () => {
    try {
      setIsUserMinting(true);
      document.getElementById('#identity')?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = (
          await mintOneToken(candyMachine, wallet.publicKey)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true,
          );
        }

        if (status && !status.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setIsUserMinting(false);
    }
  };

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);

  return (
    <Container style={{ display: 'flex', alignItems: 'center', height: '100vh' }}>
      <Container maxWidth="lg" style={{ position: 'relative' }}>
        <Grid container spacing={2} alignItems="center">
          {/* Desktop Grid */}
          <Grid
            item
            sm={6}
            component={Box}
            display={{ xs: 'none', sm: 'block' }}
          >
            <div>
              <div
                style={{
                  color: '#fafafb',
                  fontWeight: 'bold',
                  fontSize: 38,
                  letterSpacing: '0.16em',
                  marginBottom: 12,
                  textShadow: '0.6px 0.6px 0 #fafafb'
                }}>
                SUPADROP
              </div>

              <div style={{ color: '#cccccc', fontWeight: 600, fontSize: 24, marginBottom: 24 }}>
                ALPHA MEMBERSHIP
              </div>

              <div style={{ color: '#a7a8aa', fontSize: 20, marginBottom: 46, width: '85%' }}>
                SUPADROP Alpha membership is 500 Community members of private digital art collectors and creators group that offers NFT membership with rewards and a set list of benefits on SUPADROP Ecosystem.
              </div>
            </div>

            <MintButtonContainer
              wallet={wallet}
              candyMachine={candyMachine}
              rpcUrl={rpcUrl}
              isUserMinting={isUserMinting}
              onMint={onMint}
              width="60%"
            />
          </Grid>
          {/* End of Desktop Grid */}

          <Grid item xs={12} sm={6} style={{ textAlign: 'center' }}>
            <video width="100%" autoPlay muted loop style={{ borderRadius: 14 }}>
              <source src="video/supadrop_ticket.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Grid>

          {/* Mobile Grid */}
          <Grid
            item
            sm={12}
            component={Box}
            display={{ xs: 'block', sm: 'none' }}
            style={{ textAlign: 'center' }}
          >
            <div>
              <div
                style={{
                  color: '#fafafb',
                  fontWeight: 'bold',
                  fontSize: 28,
                  letterSpacing: '0.16em',
                  marginBottom: 6,
                  textShadow: '0.6px 0.6px 0 #fafafb'
                }}>
                SUPADROP
              </div>

              <div style={{ color: '#cccccc', fontWeight: 600, fontSize: 20, marginBottom: 16 }}>
                ALPHA MEMBERSHIP
              </div>

              <div style={{ color: '#a7a8aa', fontSize: 14, marginBottom: 20 }}>
                SUPADROP Alpha membership is 500 Community members of private digital art collectors and creators group that offers NFT membership with rewards and a set list of benefits on SUPADROP Ecosystem.
              </div>
            </div>

            <MintButtonContainer
              wallet={wallet}
              candyMachine={candyMachine}
              rpcUrl={rpcUrl}
              isUserMinting={isUserMinting}
              onMint={onMint}
            />
          </Grid>
          {/* End of Mobile Grid */}
        </Grid>
      </Container>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

const MintButtonContainer = ({
  wallet,
  candyMachine,
  rpcUrl,
  isUserMinting,
  onMint,
  width
}: {
  wallet: WalletContextState;
  candyMachine?: CandyMachineAccount;
  rpcUrl: string;
  isUserMinting: boolean;
  onMint: () => Promise<void>;
  width?: string | number;
}) => {
  return (
    <Paper
      style={{ padding: 24, backgroundColor: '#151a1f', borderRadius: 6, width: width }}
    >
      {!wallet.connected ? (
        <ConnectButton>Connect Wallet</ConnectButton>
      ) : (
        <>
          <Header candyMachine={candyMachine} />
          <MintContainer>
            {candyMachine?.state.isActive &&
              candyMachine?.state.gatekeeper &&
              wallet.publicKey &&
              wallet.signTransaction ? (
              <GatewayProvider
                wallet={{
                  publicKey:
                    wallet.publicKey ||
                    new PublicKey(CANDY_MACHINE_PROGRAM),
                  //@ts-ignore
                  signTransaction: wallet.signTransaction,
                }}
                gatekeeperNetwork={
                  candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                }
                clusterUrl={rpcUrl}
                options={{ autoShowModal: false }}
              >
                <MintButton
                  candyMachine={candyMachine}
                  isMinting={isUserMinting}
                  onMint={onMint}
                />
              </GatewayProvider>
            ) : (
              <MintButton
                candyMachine={candyMachine}
                isMinting={isUserMinting}
                onMint={onMint}
              />
            )}
          </MintContainer>
        </>
      )}
    </Paper>
  );
};

export default Home;
