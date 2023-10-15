import { useState, useEffect, useMemo } from 'react';
import { useWallet } from "@solana/wallet-adapter-react";
import {Connection,Keypair,PublicKey,Transaction,ConfirmOptions,SystemProgram,clusterApiUrl,SYSVAR_CLOCK_PUBKEY} from '@solana/web3.js'
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { programs } from '@metaplex/js'
import useNotify from './notify'
import axios from "axios"
import Vector from '../assets/images/Vector.png'
import HomeIcon from '../assets/images/home-icon.png'
import StakingIcon from '../assets/images/staking-icon.png'
import ShopIcon from '../assets/images/shop-icon.png'
import AuctionsIcon from '../assets/images/auctions-icon.png'
import LabIcon from '../assets/images/lab-icon.png'
import SniperIcon from '../assets/images/sniper-icon.png'
import WalletIcon from '../assets/images/wallet-icon.png'

// import NFT from '../assets/images/nft.png'
import {WalletConnect} from '../wallet';
// const nfts = Array(30).fill(0)

let wallet : any
// let conn = new Connection(clusterApiUrl('devnet'))
// // let conn = new Connection("https://ssc-dao.genesysgo.net/")
let conn = new Connection("https://shy-morning-waterfall.solana-mainnet.quiknode.pro/")
let notify: any
const axios_timeout : any = 5000;

const { metadata: { Metadata } } = programs
const programId = new PublicKey('botidfegKtYsu7taaMbYo5rs5Zx6cfrcgeiDZtCrnwv')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
const idl = require('./staking.json')
const confirmOption : ConfirmOptions = {commitment : 'finalized',preflightCommitment : 'finalized',skipPreflight : false}
const STAKING_DATA_SIZE = 8+ 32+32+1+32+8+8+1;

const POOL_DATA = {
	// token : new PublicKey("4YnWvpPRFypDAjzDbTegBivy6hbDp8UAMRKrCkmvAhdP"),
	token : new PublicKey("4YnWvpPRFypDAjzDbTegBivy6hbDp8UAMRKrCkmvAhdP"),
	period : 86400,
	pools : [
		// {
		// 	address : new PublicKey("4NfGSvWeLuEQzuq4u32pBj8M4rKKpKRGR9BNqvN1kXv8"),
		// 	tokenAccount : new PublicKey('4oc1jN5P4N3PaZSWhAeSB6sHfzHiPD3QmccG7TCGsgJj'),
		// 	collectionName : "Gorilla",
		// 	// collectionName : "OMENS",
		// 	rewardAmount : 0.01
		// },
		{
			address : new PublicKey("7m1h1LQ5PfbpxSMqm4o4hzJb7uY53S27BA4iZSv9XTvT"),
			// tokenAccount : new PublicKey('HPcumqhpTfHYPc62u4S83vABbLuKg9Nx4o1DkU9kkWpa'),
			collectionName : "SolBots",
			rewardAmount : 8
		},
	],
}

export default function Home(){
	wallet = useWallet()
	notify = useNotify()

	const { publicKey, signTransaction, signAllTransactions } = wallet;

	const [page, setPage] = useState(0)

	const [isOpenMenu, setIsOpenMenu] = useState(false)

	const [ownedNfts, setOwnedNfts] = useState<any[]>([])
	const [ownedStakeNfts, setOwnedStakeNfts] = useState<any[]>([])
	const [ownedTokenAmount, setOwnedTokenAmount] = useState(0)

	useEffect(()=>{
		if(!wallet.disconnecting && wallet.publicKey){
			getTokenAmount()
			getOwnedNfts()
		}else{
			setOwnedTokenAmount(0)
			setOwnedNfts([])
			setOwnedStakeNfts([])
		}
	},[wallet])
	const [program] = useMemo(()=>{
		const provider = new anchor.Provider(conn, wallet as any, confirmOption)
		const program = new anchor.Program(idl, programId, provider)
		return [program]
	}, [])
	const createAssociatedTokenAccountInstruction = (
		associatedTokenAddress: anchor.web3.PublicKey,
		payer: anchor.web3.PublicKey,
		walletAddress: anchor.web3.PublicKey,
		splTokenMintAddress: anchor.web3.PublicKey
		) => {
		const keys = [
		  { pubkey: payer, isSigner: true, isWritable: true },
		  { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
		  { pubkey: walletAddress, isSigner: false, isWritable: false },
		  { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
		  {
			pubkey: anchor.web3.SystemProgram.programId,
			isSigner: false,
			isWritable: false,
		  },
		  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
		  {
			pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
			isSigner: false,
			isWritable: false,
		  },
		];
		return new anchor.web3.TransactionInstruction({
		  keys,
		  programId: ASSOCIATED_TOKEN_PROGRAM_ID,
		  data: Buffer.from([]),
		});
	}
	const getTokenWallet = async (owner: PublicKey,mint: PublicKey) => {
		return (
		  await PublicKey.findProgramAddress(
			[owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
			ASSOCIATED_TOKEN_PROGRAM_ID
		  )
		)[0];
	}
	const getMetadata = async (
		mint: PublicKey
		  ): Promise<PublicKey> => {
		return (
		  await PublicKey.findProgramAddress(
			[
			  Buffer.from("metadata"),
			  TOKEN_METADATA_PROGRAM_ID.toBuffer(),
			  mint.toBuffer(),
			],
			TOKEN_METADATA_PROGRAM_ID
		  )
		)[0];
	};
	const getTokenAmount = async() => {
		try{
			if(wallet!=null && wallet.publicKey!=null){
				const tokenAccount = await getTokenWallet(wallet.publicKey, POOL_DATA.token)
				let amount = 0
				if(await conn.getAccountInfo(tokenAccount)){
					let resp : any = (await conn.getTokenAccountBalance(tokenAccount)).value
					amount = Number(resp.uiAmount)
				}
				setOwnedTokenAmount(amount)
			}else{
				setOwnedTokenAmount(0)
			}
		}catch(err){
			setOwnedTokenAmount(0)
		}
	}

	async function getNftsForOwner(
		// conn : any,
		owner : PublicKey
		){

		console.log("+ getNftsForOwner")

		const verifiednfts: any = []

		const allnfts: any = [];

		const nftaccounts : any = [];

		// const randWallet = new anchor.Wallet(Keypair.generate())
		// const provider = new anchor.Provider(conn,randWallet,confirmOption)
		// const program = new anchor.Program(idl,programId,provider)
		const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {programId: TOKEN_PROGRAM_ID});

		let tokenAccount, tokenAmount;

		for (let index = 0; index < tokenAccounts.value.length; index++) {
			tokenAccount = tokenAccounts.value[index];
			tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
			if (tokenAmount.amount == '1' && tokenAmount.decimals == 0) {
				const nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
				let tokenmetaPubkey = await Metadata.getPDA(nftMint);
				allnfts.push(tokenmetaPubkey)
				nftaccounts.push(tokenAccounts.value[index].pubkey)
			}
		}

		let nftinfo: any[] = [];
		const buffer = [...allnfts];
		let count = 100;
		while(buffer.length > 0) {
			if(buffer.length < 100) {
				count = buffer.length;
			} else {
				count = 100;
			}
			nftinfo = [...nftinfo.concat(await conn.getMultipleAccountsInfo(buffer.splice(0, count)))];
		}

		// if(buffer.length > 0) {
		// 	nftinfo.push(buffer)
		// }

		// console.log("all info", allinfo);

		// const nftinfo: any = await conn.getMultipleAccountsInfo(allinfo);

		// console.log("nft info", nftinfo);

		// let tokenCount = nftinfo.length

		for(let i = 0; i < nftinfo.length; i++) {
			
			if(nftinfo[i] == null) {
				continue;
			}

			let metadata : any = new Metadata(owner.toBase58(), nftinfo[i])

			POOL_DATA.pools.map( async (item, idx)=>{

				if(metadata.data.data.name.includes(item.collectionName)){

					let data: any;
	
					try {
						data = await axios.get(metadata.data.data.uri, {timeout: axios_timeout});
					} catch(error) {
						console.log(error);
						return;
					}
	
					// console.log("data loaded", data)
	
					if(!data) {
						// console.log("data error")
						return;
					}
	
					const entireData = { ...data.data, id: Number(data.data.name.replace( /^\D+/g, '').split(' - ')[0])}
	
					let nftMint = new PublicKey(metadata.data.mint)

					verifiednfts.push({address : nftMint, account: nftaccounts[i], metadata : metadata.data.data, offChainData : entireData, selected : false, family : idx})
				}
			})
		}

		verifiednfts.sort(function (a: any, b: any) {
			if (a.name < b.name) { return -1; }
			if (a.name > b.name) { return 1; }
			return 0;
		})

		return verifiednfts
	}

	// async function getNftsForOwner(
	// 	owner : PublicKey
	// 	){
	// 	const allTokens: any[] = []
	// 	const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {
	// 	  programId: TOKEN_PROGRAM_ID
	// 	});
	// 	for (let index = 0; index < tokenAccounts.value.length; index++) {
	// 	  try{
	// 		const tokenAccount = tokenAccounts.value[index];
	// 		const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
  
	// 		if (tokenAmount.amount === "1" && tokenAmount.decimals == "0") {
	// 		  let nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
	// 		  let pda = await getMetadata(nftMint)
	// 		  const accountInfo: any = await conn.getParsedAccountInfo(pda);
	// 		  let metadata : any = new Metadata(owner.toString(), accountInfo.value);
	// 		  const { data }: any = await axios.get(metadata.data.data.uri)
	// 		  POOL_DATA.pools.map((item, idx)=>{
	// 		  	if(metadata.data.data.symbol === item.collectionName){
	// 				const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0]) }
	// 				allTokens.push({address : nftMint, metadata : metadata.data.data, offChainData : entireData, selected : false, family : idx })
	// 		  	}
	// 		  })
	// 		}
	// 		allTokens.sort(function (a: any, b: any) {
	// 		  if (a.name < b.name) { return -1; }
	// 		  if (a.name > b.name) { return 1; }
	// 		  return 0;
	// 		})
	// 	  } catch(err) {
	// 		continue;
	// 	  }
	// 	}
	// 	console.log(allTokens)
	// 	return allTokens
	// }

	async function getStakedNftsForOwner(
		// conn : any,
		owner : PublicKey
	){
	
		console.log("+ getStakedNftsForOwner")
		
		const verifiednfts: any = [];

		const allnfts: any = [];
		
		const stakedNfts: any = [];
		
		const randWallet = new anchor.Wallet(Keypair.generate())
		const provider = new anchor.Provider(conn,randWallet,confirmOption)
		const program = new anchor.Program(idl,programId,provider)
		const walletAddress = wallet.publicKey.toBase58()
		
		for(let idx in POOL_DATA.pools){

			let item = POOL_DATA.pools[idx]
			let resp = await conn.getProgramAccounts(programId,{
				dataSlice : {length : 0, offset : 0},
				filters:[
					{dataSize : STAKING_DATA_SIZE},
					{memcmp:{offset:8,bytes:item.address.toBase58()}},
					{memcmp:{offset:73,bytes:walletAddress}}
				]
			})
			
			let stakedNft: any;
			
			for (let index = 0; index < resp.length; index++) {
				stakedNft = await program.account.stakingData.fetch(resp[index].pubkey);
				// console.log("staked nft", stakedNft)
				if(stakedNft.isStaked === false) continue;
				const nftMint = new PublicKey(stakedNft.nftMint)
				let tokenmetaPubkey = await Metadata.getPDA(nftMint);
				allnfts.push(tokenmetaPubkey);
				stakedNfts.push({data: stakedNft, account: resp[index].pubkey});
			}
			
			let nftinfo: any[] = [];
			const buffer = [...allnfts];
			let count = 100;
			while(buffer.length > 0) {
				if(buffer.length < 100) {
					count = buffer.length;
				} else {
					count = 100;
				}
				nftinfo = [...nftinfo.concat(await conn.getMultipleAccountsInfo(buffer.splice(0, count)))];
			}
			// const nftinfo: any = await conn.getMultipleAccountsInfo(allnfts);
			
			// let tokenCount = nftinfo.length
			
			for(let i = 0; i < nftinfo.length; i++) {

				if(nftinfo[i] == null) {
					continue;
				}
				
				let metadata : any = new Metadata(owner, nftinfo[i])
			
				// console.log("get data")

				let data: any;

				try {
					data = await axios.get(metadata.data.data.uri, {timeout: axios_timeout});
				} catch(error) {
					console.log(error);
					continue;
				}

				// console.log("data loaded", data)

				if(!data) {
					// console.log("data error")
					continue;
				}

				const entireData = { ...data.data, id: Number(data.data.name.replace( /^\D+/g, '').split(' - ')[0])}

				// console.log("data", entireData);

				let nftMint = new PublicKey(metadata.data.mint)

				// console.log("account", stakedNfts[i].account.toBase58(), nftMint.toBase58())

				// verifiednfts.push({account_address : tokenAccounts.value[i].pubkey, mint_address : nftMint, ...entireData})
				// console.log("data", stakedNfts[i])
				verifiednfts.push({address : stakedNfts[i].data.nftMint, stakingDataAccount : stakedNfts[i].account, metadata : metadata.data.data, offChainData : entireData, stakeTime : stakedNfts[i].data.stakeTime.toNumber(), claimNumber : stakedNfts[i].data.claimNumber.toNumber(), selected : false, family : idx})
			}

		}
		
		verifiednfts.sort(function (a: any, b: any) {
			if (a.name < b.name) { return -1; }
			if (a.name > b.name) { return 1; }
			return 0;
		})	
	
		return verifiednfts
	}

	// async function getStakedNftsForOwner(
	// 	owner : PublicKey,
	// 	){
	// 	try{
	// 		const allTokens : any[] = []
	// 		const walletAddress = wallet.publicKey.toBase58()
	// 		for(let idx in POOL_DATA.pools){
	// 			let item = POOL_DATA.pools[idx]
	// 			let resp = await conn.getProgramAccounts(programId,{
	// 				dataSlice : {length : 0, offset : 0},
	// 				filters:[
	// 					{dataSize : STAKING_DATA_SIZE},
	// 					{memcmp:{offset:8,bytes:item.address.toBase58()}},
	// 					{memcmp:{offset:73,bytes:walletAddress}}
	// 				]
	// 			})
	// 			for(let nftAccount of resp){
	// 				let stakedNft = await program.account.stakingData.fetch(nftAccount.pubkey)
	// 				if(stakedNft.isStaked === false) continue;
	// 				try{
	// 					let pda = await getMetadata(stakedNft.nftMint)
	// 					const accountInfo: any = await conn.getParsedAccountInfo(pda);
	// 					let metadata : any = new Metadata(owner.toString(), accountInfo.value);
	// 					const { data }: any = await axios.get(metadata.data.data.uri)
	// 					const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0]) }
	// 					allTokens.push({address : stakedNft.nftMint, stakingDataAccount : nftAccount.pubkey, metadata : metadata.data.data, offChainData : entireData, stakeTime : stakedNft.stakeTime.toNumber(), claimNumber : stakedNft.claimNumber.toNumber(), selected : false, family : idx})
	// 				}catch(err){
	// 					console.log(err)
	// 					continue;
	// 				}
	// 			}	
	// 		} 
	// 		return allTokens
	// 	}catch(err){
	// 		return []
	// 	}
	// }
	async function getOwnedNfts(){
		// const owner =  new PublicKey("BTMnXw12vraMgPHVW54NxPDN3ywYyRAVxcqtbwwzfcPQ");
		// const mint = new PublicKey("DcUfQeGA5yy8cZXewZWE9xLWGbFF1om6Ag14mv4o8b78");
		// const account = await getTokenWallet(owner, mint);
		// console.log("nft account", account.toBase58());
		if(wallet.publicKey){
			setOwnedNfts(await getNftsForOwner(wallet.publicKey))
			setOwnedStakeNfts(await getStakedNftsForOwner(wallet.publicKey))
		}
	}
	const handleSelectNft = (index : number) => {
		setOwnedNfts(ownedNfts.map((item, idx)=>{
			if(index === idx){
				return {...item, selected : !item.selected}
			}
			return item
		}))
	}
	const handleSelectStakeNft = (index : number, claimable_amount : number) => {
		setOwnedStakeNfts(ownedStakeNfts.map((item, idx)=>{
			if(index === idx){
				return {...item, selected : !item.selected, claimable_amount : claimable_amount}
			}
			return item
		}))
	}

	const stake = async(isAll : boolean) => {

		try{
			let transactions : Transaction[] = [];

			let balance : any = await conn.getBalance(wallet.publicKey);

			const decimals : number = 9;

			if(balance > Math.pow(10, decimals))
				balance -= Math.pow(10, decimals - 1)
			else
				balance = 0;

			// let pool = POOL_DATA.address
			for(let item of ownedNfts){
				let pool = POOL_DATA.pools[item.family].address
				if(isAll===false && item.selected===false) continue;
				let transaction = new Transaction()
				let nftMint = item.address
				const [stakingData, bump] = await PublicKey.findProgramAddress([nftMint.toBuffer(), pool.toBuffer()],programId)
				if((await conn.getAccountInfo(stakingData)) == null){
					const metadata = await getMetadata(nftMint)
					transaction.add(program.instruction.initStakingData(
						new anchor.BN(bump),
						{
							accounts:{
								owner : wallet.publicKey,
								pool : pool,
								nftMint : nftMint,
								metadata : metadata,
								stakingData : stakingData,
								systemProgram : SystemProgram.programId,
							}
						}
					))
				}
				let nftTo = await getTokenWallet(pool, nftMint)
				if((await conn.getAccountInfo(nftTo)) == null)
					transaction.add(createAssociatedTokenAccountInstruction(nftTo,wallet.publicKey, pool, nftMint))
				transaction.add(program.instruction.stake(
					new anchor.BN(balance),
					{
					accounts:{
						owner : wallet.publicKey,
						pool : pool,
						stakingData : stakingData,
						nftFrom : item.account,
						nftTo : nftTo,
						tokenProgram : TOKEN_PROGRAM_ID,
						systemProgram : SystemProgram.programId,
						clock : SYSVAR_CLOCK_PUBKEY,
					}
				}))
				transactions.push(transaction)
			}
			await sendAllTransaction(transactions)
			notify('success', 'Success!')
		}catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}
	}
	const unstake = async(isAll : boolean) => {
		let balance : any = await conn.getBalance(wallet.publicKey);
		const decimals : number = 9;
		if(balance > Math.pow(10, decimals))
			balance -= Math.pow(10, decimals - 1)
		else
			balance = 0;
		try{
			let transactions : Transaction[] = []

			// let pool = POOL_DATA.address
			for(let item of ownedStakeNfts){
				let pool = POOL_DATA.pools[item.family].address
				let nftMint = item.address
				let nftFrom = await getTokenWallet(pool, nftMint)
				let tokenFrom = await getTokenWallet(pool, POOL_DATA.token)
				if(isAll==false && item.selected===false) continue;
				// if(item.claimable_amount <= 0) {
				// 	notify('error', 'You should claim first!')
				// 	return
				// }
				let transaction = new Transaction()

				const [stakingData, ] = await PublicKey.findProgramAddress([nftMint.toBuffer(), pool.toBuffer()],programId)

				let nftTo = await getTokenWallet(wallet.publicKey, nftMint)
				if((await conn.getAccountInfo(nftTo)) == null)
					transaction.add(createAssociatedTokenAccountInstruction(nftTo,wallet.publicKey, wallet.publicKey, nftMint))
				
				let tokenTo = await getTokenWallet(wallet.publicKey, POOL_DATA.token)
				if((await conn.getAccountInfo(tokenTo))==null){
					transaction.add(createAssociatedTokenAccountInstruction(tokenTo, wallet.publicKey, wallet.publicKey, POOL_DATA.token))
				}

				// console.log("token", tokenFrom.toBase58(), tokenTo.toBase58())

				transaction.add(program.instruction.unstake(
					new anchor.BN(balance),
					{
					accounts:{
						owner : wallet.publicKey,
						pool : pool,
						stakingData: item.stakingDataAccount,
						nftFrom : nftFrom,
						nftTo : nftTo,
						tokenFrom : tokenFrom,
						tokenTo : tokenTo,
						tokenProgram : TOKEN_PROGRAM_ID,
						systemProgram : SystemProgram.programId,
						clock : SYSVAR_CLOCK_PUBKEY
					}
				}))
				transactions.push(transaction)
			}
			await sendAllTransaction(transactions)
			notify('success', 'Success!')
		}catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}
	}
	const claim = async() => {
		let balance : any = await conn.getBalance(wallet.publicKey);
		const decimals : number = 9;
		if(balance > Math.pow(10, decimals))
			balance -= Math.pow(10, decimals - 1)
		else
			balance = 0;
		try{
			let transactions : Transaction[] = []
			// let pool = POOL_DATA.address
			let tokenTo = await getTokenWallet(wallet.publicKey, POOL_DATA.token)
			if((await conn.getAccountInfo(tokenTo))==null){
				let tx = new Transaction()
				tx.add(createAssociatedTokenAccountInstruction(tokenTo, wallet.publicKey, wallet.publicKey, POOL_DATA.token))
				transactions.push(tx)
			}

			for(let item of ownedStakeNfts){
				let pool = POOL_DATA.pools[item.family].address
				let tokenFrom = await getTokenWallet(pool, POOL_DATA.token)
				let transaction = new Transaction()
				// console.log("token", tokenFrom.toBase58(), tokenTo.toBase58())
				transaction.add(program.instruction.claim(
					new anchor.BN(balance),
					{
					accounts:{
						owner : wallet.publicKey,
						pool : pool,
						poolAddress : pool,
						stakingData : item.stakingDataAccount,
						tokenFrom : tokenFrom,
						tokenTo : tokenTo,
						tokenProgram : TOKEN_PROGRAM_ID,
						clock : SYSVAR_CLOCK_PUBKEY
					}
				}))
				transactions.push(transaction)
			}
			// console.log(transactions)
			await sendAllTransaction(transactions)
		  notify('success', 'Success!')
		} catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}		
	}
	async function sendTransaction(transaction : Transaction, signers : Keypair[]) {
		transaction.feePayer = wallet.publicKey
		transaction.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
		// await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
		if(signers.length != 0) await transaction.partialSign(...signers)
		const signedTransaction = await wallet.signTransaction(transaction);
		let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
		await conn.confirmTransaction(hash);
		return hash
	}
	async function sendAllTransaction(transactions : Transaction[]){
		let unsignedTxns : Transaction[] = []
		let block = await conn.getLatestBlockhash();
		for(let i =0; i<transactions.length;i++){
			let transaction = transactions[i]
			transaction.recentBlockhash = block.blockhash;
			transaction.feePayer = publicKey
			// transaction.setSigners(wallet.publicKey)
			unsignedTxns.push(transaction)
		}
		const signedTxns = await signAllTransactions(unsignedTxns)
		for(let i=0;i<signedTxns.length;i++){
			let hash = await conn.sendRawTransaction(await signedTxns[i].serialize())
			await conn.confirmTransaction(hash)
		}
	}

	return <div className="back-group">
	{
		page===0 ?
			<div className={isOpenMenu ? "card back-panel home-page dark-panel" : "card back-panel home-page"}>
				<div className='bottom-title-1'>
					&gt; solbots v1.0
				</div>
				<div className='bottom-title-2'
					onClick={()=>{
					setIsOpenMenu(true)
				}}>
					&gt; enter
				</div>
				{
					isOpenMenu &&
					<div className='menu-bar'>
						<div className='menu-item' onClick={()=>{
							setPage(0)
							setIsOpenMenu(false)
						}}>
							<button><img src={HomeIcon} alt="home"></img></button>
							<p>&gt; home</p>
						</div>
						<div className='menu-item' onClick={()=>{
							setPage(1)
							setIsOpenMenu(false)
						}}>
							<button><img src={StakingIcon} alt="staking"></img></button>
							<p>&gt; staking</p>
						</div>	
						<div className='menu-item'>
							<button><img src={ShopIcon} alt="shop"></img></button>
							<p>&gt; shop</p>
						</div>	
						<div className='menu-item'>
							<button><img src={AuctionsIcon} alt="auctions"></img></button>
							<p>&gt; auctions</p>
						</div>
						<div className='menu-item'>
							<button><img src={LabIcon} alt="lab"></img></button>
							<p>&gt; lab</p>
						</div>
						<div className='menu-item'>
							<button><img src={SniperIcon} alt="sniper"></img></button>
							<p>&gt; sniper</p>
						</div>
						<div className='menu-item'>
							{/* <button><img src={WalletIcon} alt="wallet"></img></button> */}
							<WalletConnect></WalletConnect>
							<p>&gt; wallet</p>
						</div>			
					</div>
				}
			</div>
		:
			<div className="card back-panel staking-page">
				<div className='card-mark'>
					<img style={{width : "40px"}} src={Vector} alt="vector"></img>
					<p style={{marginBottom : "0px"}}>oil collected</p>
					<p style={{marginBottom : "0px", fontSize : "16px", fontWeight:"500"}}>{ownedTokenAmount} $OIL</p>
				</div>
				<div className="card-content row">
					<div className="col-lg-6 card-group solbots-panel">
						<h3>solbots</h3>
						<div className="image-panel">
							<div className='row pt-2'>
								<div className='col-sm-7'>
									<button className='btn' onClick={async ()=>{
										await stake(false)
										await getOwnedNfts()
									}}>&gt; Stake Selected</button>
								</div>
								<div className='col-sm-5'>
									<button className='btn' onClick={async ()=>{
										await stake(true)
										await getOwnedNfts()
									}}>&gt; Stake All</button>
								</div>
							</div>
							<div className='nft-panel pt-3 m-2'>
								<div className="nft-panel-content">
								{
									ownedNfts.map((item, idx)=>{
										return <div className='nft' key={idx}>
											<img className={item.selected ? "red-border" : "normal-border"} src={item.offChainData.image} alt="nft" onClick={()=>{
												handleSelectNft(idx)
											}}/>
											<p style={{color : item.selected ? "red" : "#e9ffc5"}}>{item.metadata.name}</p>
										</div>
									})
								}
								</div>
							</div>
						</div>
					</div>
					<div className="col-lg-6 card-group staked-panel">
						<h3>staked</h3>
						<div className="image-panel">
							<div className='row pt-2'>
								<div className='col-sm-7'>
									<button className='btn' onClick={async()=>{
										await unstake(false)
										await getOwnedNfts()
									}}>&gt; Unstake Selected</button>
								</div>
								<div className='col-sm-5'>
									<button className='btn' onClick={async()=>{
										await unstake(true)
										await getOwnedNfts()
									}}>&gt; Unstake All</button>
								</div>
							</div>
							<div className='nft-panel pt-3 m-2'>
								<div className="nft-panel-content">
								{
									ownedStakeNfts.map((item, idx)=>{
										let time = (new Date()).getTime() / 1000
										const claim_amount = POOL_DATA.pools[item.family].rewardAmount * Math.floor((time-item.stakeTime+30)/POOL_DATA.period - item.claimNumber)
										return <div className='nft' key={idx}>
											<img className={item.selected ? "red-border" : "normal-border"} src={item.offChainData.image} alt="nft" onClick={()=>{
												handleSelectStakeNft(idx, claim_amount)
											}}/>
											<p style={{color : item.selected ? "red" : "#e9ffc5", marginBottom : 0}}>{item.metadata.name}</p>
											<p style={{color : item.selected ? "red" : "#e9ffc5"}}>$OIL | {claim_amount}</p>
										</div>
									})
								}
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="claim-part">
					<button className='btn' onClick={async()=>{
						await claim()
						await getOwnedNfts()
						await getTokenAmount()
					}}>CLAIM REWARDS</button>
				</div>
				<div className='bottom-title'>&gt; created in the underworld by OMENS</div>
				<div className='menu-bar'>
					<div onClick={()=>{
						setPage(0)
						setIsOpenMenu(false)
					}}>
						<button><img src={HomeIcon} alt="home"></img></button>
						<p>&gt; home</p>
					</div>
					<div onClick={()=>{
						setPage(1)
						setIsOpenMenu(false)
					}}>
						<button><img src={StakingIcon} alt="staking"></img></button>
						<p>&gt; staking</p>
					</div>	
					<div>
						<button><img src={ShopIcon} alt="shop"></img></button>
						<p>&gt; shop</p>
					</div>	
					<div>
						<button><img src={AuctionsIcon} alt="auctions"></img></button>
						<p>&gt; auctions</p>
					</div>
					<div>
						<button><img src={LabIcon} alt="lab"></img></button>
						<p>&gt; lab</p>
					</div>
					<div>
						<button><img src={SniperIcon} alt="sniper"></img></button>
						<p>&gt; sniper</p>
					</div>			
				</div>
			</div>
	}
	</div>
}