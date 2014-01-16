<?php

namespace Hexmedia\AdministratorBundle\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class LocaleControllerTest extends WebTestCase
{
    public function testChange()
    {
        $client = static::createClient();

        $crawler = $client->request('GET', '/locale');
    }

}
