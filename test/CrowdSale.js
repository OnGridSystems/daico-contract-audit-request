// const { assertRevert, shouldFail } = require('./helpers/assertRevert');
const { BN, constants } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const Tap = artifacts.require('Tap');
const Fund = artifacts.require('Fund');
const Organization = artifacts.require('Organization');
const StableCoin = artifacts.require('StableCoin');
const Token = artifacts.require('ProjectToken');
const Gov = artifacts.require('Governance'); // ToDo change to Governance after impl
const CS = artifacts.require('CrowdSale');
const ContributorRelay = artifacts.require('ContributorRelay');

contract('ContributorRelay isolated', function (accounts) {
  const contributorAcct = accounts[1];
  describe('with contracts stack', async function () {
    let cr, dai;
    beforeEach(async function () {
      cr = await ContributorRelay.new(contributorAcct);
      dai = await StableCoin.new(cr.address, new BN('1000'), 'DAI');
    });

    it('ContributorRelay vars', async function () {
      await cr.contributorAcct();
      await cr.crowdSaleCtct();
    });

    it('check ContributorRelay functions', async function () {
      await cr.returnStcToContributor(dai.address, new BN('1000'), { from: contributorAcct });
    });
  });
});

contract('CrowdSale full behavior', function (accounts) {
  const webPlatformAcct = accounts[1];
  const admin = accounts[0];
  const contributorAcct = accounts[2];
  describe('with contracts stack', async function () {
    let dai, fund, token, org, cs, tap, gov;
    beforeEach(async function () {
      token = await Token.new();
      org = await Organization.new('TestOrganisation', token.address, admin);
      fund = await Fund.new(org.address, 'TestFund');
      // ToDo the first arg of tap should be spender = gov
      tap = await Tap.new(ZERO_ADDRESS, fund.address, new BN(0), 'SpendingTap');
      gov = await Gov.new(fund.address, token.address); // ToDo change after Gov refactoring
      dai = await StableCoin.new(contributorAcct, new BN('1000000'), 'DAI');
      await dai.setDecimals(18);
      await org.addStableCoin(dai.address);
      cs = await CS.new(org.address, gov.address, tap.address, fund.address, webPlatformAcct);
    });

    it('check CrowdSale vars and consts', async function () {
      await cs.SOFTCAP_AUSD();
      await cs.SOFTCAP_DEADLINE();
      await cs.HARDCAP_AUSD();
      await cs.HARDCAP_DEADLINE();
      await cs.MIN_CONTRIB_AUSD();
      await cs.raisedAUsd();
      await cs.softCapReached();
      await cs.running();
      await cs.webPlatformAcct();
      await cs.org();
      await cs.gov();
      await cs.refundTap();
    });

    it('check CrowdSale functions', async function () {
      await cs.newContributorRelay(ZERO_ADDRESS);
      await cs.start();
      await cs.finish();
      await cs.tryToSwitchState();
      await cs.convertStcAmountToAUsd(dai.address, new BN(1000000));
      await cs.calculateTokensByAUsdContribution(new BN(0));
    });

    describe('with ContributorRelay', async function () {
      let cr, crAddr;
      beforeEach(async function () {
        const { logs } = await cs.newContributorRelay(contributorAcct);
        crAddr = logs[0].args.contributorRelay;
        cr = await ContributorRelay.at(crAddr);
      });

      it('check ContributorRelay vars', async function () {
        await cr.contributorAcct();
        await cr.crowdSaleCtct();
      });

      it('processContribution', async function () {
        await dai.transfer(crAddr, new BN('1000000'), { from: contributorAcct });
        await cs.processContribution(crAddr, dai.address, new BN('1000000'));
      });
    });
  });
});
