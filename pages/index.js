import { useEffect, useState, useReducer } from 'react';
import { ethers } from 'ethers';
import { format, formatDistanceToNow } from 'date-fns'
import Head from 'next/head';
import Image from 'next/image';
import ABI from '../utils/WavePortal.json';

import styles from '../styles/Home.module.css';

const ADDRESS = '';

const checkIfWalletConnected = async (setAccount, setLoading, setError) => {
    try {
        setLoading('Connecting to Wallet');
        const { ethereum } = window;

        if (!ethereum) {
            setError('you need metamask');
            return;
        }

        ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length !== 0) {
                setAccount(accounts[0]);
            } else {
                setAccount(null);
            }
        });

        const accounts = await ethereum.request({ method: 'eth_accounts' });

        setLoading(null);

        if (accounts.length !== 0) {
            return setAccount(accounts[0]);
        }

        setAccount(null);

        return setError('');
    } catch (error) {
        setLoading(null);
        setError('An error occured', error);
    }
};

const getContract = () => {
    const { ethereum } = window;
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    return new ethers.Contract(ADDRESS, ABI.abi, signer);
};

const loadAllWaves = async (dispatch, setLoading, setError) => {
    try {
        setLoading('waves');

        const wavePortalContract = getContract();
        const rawWaves = await wavePortalContract.getAllWaves();

        setLoading(null);
        const waves = rawWaves.map((wave) => ({
            address: wave?.waver,
            timestamp: new Date(wave?.timestamp * 1000),
            message: wave?.message
        }));

        dispatch({ type: 'init', payload: waves });

        wavePortalContract.on('NewWave', (from, timestamp, message) => {
            return dispatch({
                type: 'add',
                payload: {
                    timestamp: new Date(timestamp * 1000),
                    address: from,
                    message
                }
            });
        });
    } catch (error) {
        setError('Error connecting', error);
        setLoading(null);
    }
}

const reducer = (state, action) => {
    switch (action.type) {
        case 'init':
            return [...action.payload].sort((a, b) => b.timestamp - a.timestamp);
        case 'add':
            return [
                ...state,
                action.payload
            ].sort((a, b) => b.timestamp - a.timestamp);
        default:
            return state;
    }
};

export default function Home() {
    const [account, setAccount] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(null);
    const [wave, setWave] = useState('');
    const [waves, dispatch] = useReducer(reducer, []);

    useEffect(() => {
        checkIfWalletConnected(setAccount, setLoading, setError);
    }, []);

    useEffect(() => {
        if (account) {
            loadAllWaves(dispatch, setLoading, setError);
        }
    }, [account]);

    const waveMe = async () => {
        try {
            setLoading('Waving...');

            const wavePortalContract = getContract();

            const waveTxn = await wavePortalContract.wave(wave.trim(), { gasLimit: 300000 });

            await waveTxn.wait();

            setLoading(null);

            return setWave('');
        } catch (error) {
            setWave('');
            setLoading(null);

            if (error?.error?.message) {
                setError(error.error.message);
            } else {
                setAccount(null);
                setError('Unknown Account');
            }
        }
    };
    const connectWallet = async () => {
        try {
            const { ethereum } = window;
            setLoading('Connecting wallet');

            if (!ethereum) {
                console.log('get metamask');
                return;
            }

            const accounts = await ethereum.request({ method: "eth_requestAccounts" });

            setLoading(null);
            return setAccount(accounts[0]);
        } catch (error) {
            setLoading(null);
            console.log(error);
        }
    }

    const renderProgress = () => {
        if (!loading) {
            return null;
        }

        return (
            <p className="loading">{loading}</p>
        )
    }

    const renderWaves = () => {
        if (!account || waves.length === 0) {
            return null;
        }

        return (
            <ul className={styles.grid}>
                {waves.map((wave) => (
                    <li key={wave.timestamp.getTime()} className={styles.card}>
                        <h2>Address: {wave.address}</h2>
                        <h3 title={format(wave.timestamp, "EEEE LLLL dd, yyyy hh:mm:ss b")}>
                            {formatDistanceToNow(wave.timestamp, { addSuffix: true })}
                        </h3>
                        <p>{wave.message}</p>
                    </li>
                ))}
            </ul>
        )
    }

    const renderWalletConnect = () => {
        if (account) {
            return null;
        }

        return (
            <>
                <p className={styles.description}>
                    Hey there. Connect your Ethereum wallet and wave at me!
                </p>
                <button className={styles.primary} onClick={connectWallet} disabled={loading}>{loading ? 'Connecting...' : 'Connect'}</button>
            </>
        )
    }

    const renderError = () => {
        if (!error) {
            return null;
        }

        setTimeout(() => {
            setError(null);
        }, 3000);

        return <p className={styles.error}>{error}</p>
    }

    const renderWaveButton = () => {
        if (!account) {
            return null;
        }

        return (
            <div className={styles.wave}>
                <textarea
                    placeholder="Write me a message. Please be nice!"
                    disabled={loading}
                    value={wave}
                    onInput={(event) => setWave(event.target.value)} />
                <button
                    className={styles.primary}
                    onClick={waveMe}
                    disabled={loading || wave === ''}
                >{loading ? 'Please wait...' : 'Wave at me'}</button>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Head>
            <title>Wave! 👋</title>
            <meta name="description" content="Generated by create next app" />
            <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>
                    👋 Hey there. This is Naveed. <br />Nice to meet you.
                </h1>

                { renderError() }
                { renderProgress() }
                { renderWalletConnect() }
                { renderWaveButton() }
                { renderWaves() }
            </main>

            <footer className={styles.footer}>
            <a
                href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
                target="_blank"
                rel="noopener noreferrer"
            >
                Powered by{' '}
                <span className={styles.logo}>
                <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
                </span>
            </a>
            </footer>
        </div>
    )
}
