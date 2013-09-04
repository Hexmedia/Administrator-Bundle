<?php

namespace Hexmedia\AdministratorBundle\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class EditModeControllerTest extends WebTestCase
{
    public function testEnable()
    {
        $client = static::createClient();

        $crawler = $client->request('GET', '/enable');
    }

    public function testExit()
    {
        $client = static::createClient();

        $crawler = $client->request('GET', '/exit');
    }

}
