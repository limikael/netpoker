<?php

require_once __DIR__."/../src/controller/ApiController.php";

use wpnetpoker\Tournament;
use wpnetpoker\TournamentRegistration;
use wpnetpoker\NetPokerPlugin;
use wpnetpoker\ApiController;

class TournamentTest extends WP_UnitTestCase {

	function test_tournament_register() {
		NetPokerPlugin::init()->activate();

		$tournament=new Tournament();
		$tournament->fee=100;
		$tournament->commission=20;
		$tournament->save();
		$tournamentId=$tournament->id;

		$user_id = $this->factory->user->create();
		$user=get_user_by("id",$user_id);

		$tournament->registerUser($user);

		$t=Tournament::findOne($tournamentId);
		$balance=NetPokerPlugin::init()->getEntityBalance("ply",$user);

		$this->assertEquals(880,$balance);
		$this->assertTrue($t->isUserRegistered($user));
	}

	function test_tournament_play() {
		NetPokerPlugin::init()->activate();

		$tournament=new Tournament();
		$tournament->fee=100;
		$tournament->commission=20;
		$tournament->minRegistrations=2;
		$tournament->save();

		$user_ids=$this->factory->user->create_many(2);
		$tournament->registerUser(get_user_by("id",$user_ids[0]));
		$tournament->registerUser(get_user_by("id",$user_ids[1]));

		ApiController::init()->tournamentStart(array("tournamentId"=>$tournament->id));

		$t=Tournament::findOne($tournament->id);
		$this->assertEquals($t->state,Tournament::PLAYING);

		ApiController::init()->tournamentFinish(array(
			"tournamentId"=>$tournament->id,
			"finishorder"=>json_encode(array($user_ids[1],$user_ids[0]),TRUE),
			"payouts"=>json_encode(array(123,56))
		));

		$t=Tournament::findOne($tournament->id);
		$this->assertEquals($t->state,Tournament::FINISHED);

		$regs=TournamentRegistration::findAllByQuery("SELECT * FROM :table ORDER BY finishIndex");

		$this->assertEquals($regs[0]->payout,123);
		$this->assertEquals($regs[1]->payout,56);

		$this->assertEquals(NetPokerPlugin::init()->getEntityBalance("ply",get_user_by("id",$user_ids[0])),936);
		$this->assertEquals(NetPokerPlugin::init()->getEntityBalance("ply",get_user_by("id",$user_ids[1])),1003);
	}
}

